// Habla con el GitHub Project del equipo a través de la CLI `gh`.
// Lo usan las skills /tarjeta-* para leer y mover tarjetas.
//
// Uso:
//   node scripts/tablero.mjs ver <NN>                    tarjeta, campos y dependencias
//   node scripts/tablero.mjs mover <NN> "<Estado>"       cambia la columna (Status)
//   node scripts/tablero.mjs campo <NN> <Campo> <Valor>  cambia Área, Módulo, Prioridad...
//   node scripts/tablero.mjs agregar <NN>                suma el issue al tablero
//   node scripts/tablero.mjs en-curso [usuario]          tarjetas En curso de alguien (por defecto, vos)
//   node scripts/tablero.mjs siguiente [usuario]         tarjetas de "Para hacer" listas para tomar
//
// Requiere `gh auth refresh -s project` una vez por persona.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(readFileSync(join(raiz, ".github", "tablero.json"), "utf8"));

if (!config.proyecto) {
    salir("Falta el número del Project en .github/tablero.json (campo \"proyecto\").");
}

const PRIORIDAD = { Alta: 0, Media: 1, Baja: 2 };

function salir(mensaje) {
    console.error(mensaje);
    process.exit(1);
}

function gh(args) {
    try {
        return execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch (error) {
        const detalle = String(error.stderr || error.message);
        if (/project/i.test(detalle) && /scope/i.test(detalle)) {
            salir("A tu token de gh le falta el permiso de Projects. Corré: gh auth refresh -s project");
        }
        salir(detalle.trim());
    }
}

function graphql(query, variables) {
    const args = ["api", "graphql", "-f", `query=${query}`];
    for (const [clave, valor] of Object.entries(variables)) {
        if (valor === undefined || valor === null) continue;
        args.push(typeof valor === "number" ? "-F" : "-f", `${clave}=${valor}`);
    }
    return JSON.parse(gh(args)).data;
}

const CAMPOS_VALOR = `
  fieldValues(first: 30) { nodes {
    ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2FieldCommon { name } } }
    ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2FieldCommon { name } } }
    ... on ProjectV2ItemFieldNumberValue { number field { ... on ProjectV2FieldCommon { name } } }
    ... on ProjectV2ItemFieldIterationValue { title startDate field { ... on ProjectV2FieldCommon { name } } }
  } }`;

const QUERY_ITEMS = `
query($owner: String!, $numero: Int!, $cursor: String) {
  repositoryOwner(login: $owner) {
    ... on ProjectV2Owner { projectV2(number: $numero) {
      id
      fields(first: 50) { nodes {
        ... on ProjectV2FieldCommon { id name dataType }
        ... on ProjectV2SingleSelectField { options { id name } }
        ... on ProjectV2IterationField { configuration { iterations { id title startDate } } }
      } }
      items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          content {
            ... on Issue {
              number title state url body
              assignees(first: 10) { nodes { login } }
              labels(first: 20) { nodes { name } }
            }
          }
          ${CAMPOS_VALOR}
        }
      }
    } }
  }
}`;

// Trae el Project entero: sus campos y todas sus tarjetas (issues).
function leerTablero() {
    const items = [];
    let cursor;
    let proyecto;
    do {
        const data = graphql(QUERY_ITEMS, { owner: config.owner, numero: config.proyecto, cursor });
        proyecto = data.repositoryOwner?.projectV2;
        if (!proyecto) salir(`No encontré el Project ${config.proyecto} de ${config.owner}.`);
        items.push(...proyecto.items.nodes);
        cursor = proyecto.items.pageInfo.hasNextPage ? proyecto.items.pageInfo.endCursor : undefined;
    } while (cursor);

    const tarjetas = items
        .filter((item) => item.content?.number)
        .map((item) => {
            const campos = {};
            for (const valor of item.fieldValues.nodes) {
                const nombre = valor.field?.name;
                if (!nombre) continue;
                campos[nombre] = valor.name ?? valor.text ?? valor.number ?? valor.title;
            }
            return {
                itemId: item.id,
                numero: item.content.number,
                titulo: item.content.title,
                estadoIssue: item.content.state,
                url: item.content.url,
                cuerpo: item.content.body ?? "",
                responsables: item.content.assignees.nodes.map((a) => a.login),
                etiquetas: item.content.labels.nodes.map((l) => l.name),
                campos,
            };
        });
    return { id: proyecto.id, campos: proyecto.fields.nodes.filter((c) => c.name), tarjetas };
}

function buscarTarjeta(tablero, numero) {
    const tarjeta = tablero.tarjetas.find((t) => t.numero === Number(numero));
    if (!tarjeta) {
        salir(`El issue #${numero} no está en el tablero. Sumalo con: node scripts/tablero.mjs agregar ${numero}`);
    }
    return tarjeta;
}

// "Depende de: #12, #15" en el cuerpo del issue.
function dependencias(tarjeta) {
    const linea = tarjeta.cuerpo.split("\n").find((l) => /depende de/i.test(l)) ?? "";
    return [...linea.matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
}

function estadoDe(tablero, numero) {
    const tarjeta = tablero.tarjetas.find((t) => t.numero === numero);
    if (!tarjeta) return "fuera del tablero";
    if (tarjeta.estadoIssue === "CLOSED") return "Hecho (issue cerrado)";
    return tarjeta.campos.Status ?? "sin estado";
}

function dependenciasPendientes(tablero, tarjeta) {
    return dependencias(tarjeta).filter((n) => !estadoDe(tablero, n).startsWith("Hecho"));
}

function editarCampo(tablero, tarjeta, nombreCampo, valor) {
    const campo = tablero.campos.find((c) => c.name.toLowerCase() === nombreCampo.toLowerCase());
    if (!campo) salir(`El Project no tiene el campo "${nombreCampo}".`);

    const args = ["project", "item-edit", "--id", tarjeta.itemId, "--project-id", tablero.id, "--field-id", campo.id];
    if (campo.options) {
        // Coincidencia exacta o por prefijo: "1" elige "1 · 24/11 al 30/11".
        const opcion = campo.options.find((o) => o.name.toLowerCase() === valor.toLowerCase())
            ?? campo.options.find((o) => o.name.toLowerCase().startsWith(`${valor.toLowerCase()} `));
        if (!opcion) salir(`"${valor}" no es una opción de ${campo.name}: ${campo.options.map((o) => o.name).join(", ")}.`);
        args.push("--single-select-option-id", opcion.id);
    } else if (campo.configuration) {
        const iteracion = campo.configuration.iterations.find((i) => i.title.toLowerCase() === valor.toLowerCase());
        if (!iteracion) salir(`"${valor}" no es una iteración activa de ${campo.name}.`);
        args.push("--iteration-id", iteracion.id);
    } else if (campo.dataType === "NUMBER") {
        args.push("--number", String(Number(valor)));
    } else {
        args.push("--text", valor);
    }
    gh(args);
    console.log(`#${tarjeta.numero}: ${campo.name} = ${valor}`);
}

function usuarioActual(usuario) {
    if (usuario && usuario !== "@me") return usuario;
    return gh(["api", "user", "--jq", ".login"]).trim();
}

function resumen(tarjeta) {
    const c = tarjeta.campos;
    const datos = [c.Status, c["Área"], c["Módulo"], c.Prioridad, c.Talle, c["Iteración"]].filter(Boolean);
    const quien = tarjeta.responsables.length ? ` @${tarjeta.responsables.join(" @")}` : " (sin asignar)";
    return `#${tarjeta.numero} ${tarjeta.titulo} [${datos.join(" · ")}]${quien}`;
}

const [comando, ...resto] = process.argv.slice(2);

switch (comando) {
    case "ver": {
        const tablero = leerTablero();
        const tarjeta = buscarTarjeta(tablero, resto[0]);
        console.log(resumen(tarjeta));
        console.log(`URL: ${tarjeta.url}`);
        console.log(`Issue: ${tarjeta.estadoIssue} · Etiquetas: ${tarjeta.etiquetas.join(", ") || "ninguna"}`);
        for (const n of dependencias(tarjeta)) console.log(`Depende de #${n}: ${estadoDe(tablero, n)}`);
        console.log("\n" + tarjeta.cuerpo);
        break;
    }
    case "mover": {
        const tablero = leerTablero();
        editarCampo(tablero, buscarTarjeta(tablero, resto[0]), "Status", resto[1]);
        break;
    }
    case "campo": {
        const tablero = leerTablero();
        editarCampo(tablero, buscarTarjeta(tablero, resto[0]), resto[1], resto.slice(2).join(" "));
        break;
    }
    case "agregar": {
        const url = `https://github.com/${config.repo}/issues/${resto[0]}`;
        gh(["project", "item-add", String(config.proyecto), "--owner", config.owner, "--url", url]);
        console.log(`#${resto[0]} agregado al tablero.`);
        break;
    }
    case "en-curso": {
        const login = usuarioActual(resto[0]);
        const tablero = leerTablero();
        const mias = tablero.tarjetas.filter(
            (t) => t.campos.Status === "En curso" && t.responsables.includes(login),
        );
        console.log(`${login} tiene ${mias.length} en curso (máximo ${config.wipPorPersona}).`);
        for (const t of mias) console.log(resumen(t));
        break;
    }
    case "siguiente": {
        const login = usuarioActual(resto[0]);
        const tablero = leerTablero();
        const candidatas = tablero.tarjetas
            .filter((t) => t.campos.Status === "Para hacer" && t.estadoIssue === "OPEN")
            .filter((t) => !t.etiquetas.includes("bloqueada"))
            .filter((t) => t.responsables.length === 0 || t.responsables.includes(login))
            .map((t) => ({ t, pendientes: dependenciasPendientes(tablero, t) }))
            .sort((a, b) =>
                a.pendientes.length - b.pendientes.length
                || Number(b.t.responsables.includes(login)) - Number(a.t.responsables.includes(login))
                || (PRIORIDAD[a.t.campos.Prioridad] ?? 9) - (PRIORIDAD[b.t.campos.Prioridad] ?? 9)
                || a.t.numero - b.t.numero,
            );
        if (candidatas.length === 0) console.log("No hay tarjetas en \"Para hacer\" para vos. Toca refinar el Backlog.");
        for (const { t, pendientes } of candidatas) {
            const aviso = pendientes.length ? ` · espera a ${pendientes.map((n) => `#${n}`).join(", ")}` : "";
            console.log(resumen(t) + aviso);
        }
        break;
    }
    default:
        salir("Comandos: ver, mover, campo, agregar, en-curso, siguiente. Mirá el encabezado de scripts/tablero.mjs.");
}
