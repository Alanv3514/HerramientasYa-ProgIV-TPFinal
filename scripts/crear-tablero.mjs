// Crea el GitHub Project "Herramientas Ya" y carga todos los issues abiertos con sus campos.
// Se corre una sola vez. Es idempotente: si el Project, un campo o una tarjeta ya existen, los reutiliza.
//
// Uso:
//   gh auth refresh -s project            (una vez, para darle permiso al token)
//   node scripts/crear-tablero.mjs        (crea el Project y carga las tarjetas)
//   node scripts/crear-tablero.mjs --asignar   (además asigna cada issue a su "Responsable sugerido")
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const rutaConfig = join(raiz, ".github", "tablero.json");
const config = JSON.parse(readFileSync(rutaConfig, "utf8"));
const asignar = process.argv.includes("--asignar");
const TITULO = "Herramientas Ya";

const ESTADOS = [
    ["📌 Cómo trabajamos", "YELLOW", "Guía del tablero y plantilla. No se mueven"],
    ["Backlog", "GRAY", "Cargada, sin refinar o fuera de esta iteración"],
    ["Para hacer", "BLUE", "Refinada: criterios, talle y dependencias. Se puede tomar"],
    ["En curso", "ORANGE", "Alguien la está haciendo. Máximo 2 por persona"],
    ["En revisión", "PURPLE", "Pull request abierto"],
    ["Hecho", "GREEN", "Integrada a main"],
];

const CAMPOS = {
    "Área": ["Backend", "Frontend", "Infra", "Docs"],
    "Módulo": ["Base", "Usuarios", "Categorías", "Herramientas", "Catálogo", "Alquileres",
        "Calificaciones", "Historial", "Administración", "Calidad", "Defensa"],
    "Prioridad": ["Alta", "Media", "Baja"],
    "Talle": ["S", "M", "L"],
    "Iteración": ["1 · 24/11 al 30/11", "2 · 1/12 al 7/12", "3 · 8/12 al 14/12"],
};

const RESPONSABLES = {
    "Federico Saenz": "FefeSaenz",
    "Santiago Ansa": "santiansaa",
    "Manuel Almarante": "almaranteManuel",
    "Alan Vinzón": "Alanv3514",
};

function gh(args, { json = false } = {}) {
    try {
        const salida = execFileSync("gh", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
        return json ? JSON.parse(salida) : salida.trim();
    } catch (error) {
        const detalle = String(error.stderr || error.message);
        if (/scope/i.test(detalle) && /project/i.test(detalle)) {
            console.error("A tu token le falta el permiso de Projects. Corré: gh auth refresh -s project");
            process.exit(1);
        }
        throw new Error(`gh ${args.join(" ")}\n${detalle.trim()}`);
    }
}

// 1. El Project: lo busca por título o lo crea.
let proyecto = gh(["project", "list", "--owner", config.owner, "--format", "json"], { json: true })
    .projects.find((p) => p.title === TITULO);
if (!proyecto) {
    proyecto = gh(["project", "create", "--owner", config.owner, "--title", TITULO, "--format", "json"], { json: true });
    console.log(`Project creado: ${proyecto.url}`);
} else {
    console.log(`Project existente: ${proyecto.url}`);
}
const numero = String(proyecto.number);

try {
    gh(["project", "link", numero, "--owner", config.owner, "--repo", config.repo]);
} catch {
    // Ya estaba vinculado.
}
gh(["project", "edit", numero, "--owner", config.owner,
    "--description", "Tablero del proyecto final de Programación IV (UTN TUP 2026)",
    "--readme", `Leé primero el issue fijado #1 «📌 Cómo trabajamos» o docs/gestion/como-trabajamos.md en ${config.repo}.`]);

// 2. Campos de selección. Si ya existen, se reutilizan.
const listarCampos = () => gh(["project", "field-list", numero, "--owner", config.owner, "--format", "json"], { json: true }).fields;
let campos = listarCampos();
for (const [nombre, opciones] of Object.entries(CAMPOS)) {
    if (campos.some((c) => c.name === nombre)) continue;
    gh(["project", "field-create", numero, "--owner", config.owner, "--name", nombre,
        "--data-type", "SINGLE_SELECT", "--single-select-options", opciones.join(",")]);
    console.log(`Campo creado: ${nombre}`);
}

// 3. Las columnas: se reemplazan las opciones de Status (Todo, In Progress, Done) por las nuestras.
campos = listarCampos();
const status = campos.find((c) => c.name === "Status");
const yaEstan = ESTADOS.every(([nombre]) => status.options.some((o) => o.name === nombre));
if (!yaEstan) {
    const opciones = ESTADOS.map(([name, color, description]) =>
        `{name: ${JSON.stringify(name)}, color: ${color}, description: ${JSON.stringify(description)}}`).join(", ");
    try {
        gh(["api", "graphql", "-f", `query=mutation { updateProjectV2Field(input: {fieldId: "${status.id}", singleSelectOptions: [${opciones}]}) { projectV2Field { ... on ProjectV2SingleSelectField { id } } } }`]);
        console.log("Columnas de Status configuradas.");
    } catch (error) {
        console.error("No pude cambiar las columnas de Status por la API. Hacelo a mano en Settings → Status:");
        console.error(ESTADOS.map(([n]) => `  - ${n}`).join("\n"));
        console.error(String(error.message).split("\n").at(-1));
        process.exit(1);
    }
    campos = listarCampos();
}

const opcion = (campo, valor) => {
    const c = campos.find((x) => x.name === campo);
    return c.options.find((o) => o.name === valor) ?? c.options.find((o) => o.name.startsWith(`${valor} `));
};

// 4. Las tarjetas: cada issue abierto, con los campos que dice su cuerpo.
const yaCargados = new Set(
    gh(["project", "item-list", numero, "--owner", config.owner, "--format", "json", "-L", "500"], { json: true })
        .items.map((i) => i.content?.number).filter(Boolean),
);
const issues = gh(["issue", "list", "-R", config.repo, "--state", "open", "--limit", "500",
    "--json", "number,title,url,body,labels"], { json: true }).sort((a, b) => a.number - b.number);

const leerCampo = (cuerpo, nombre) => cuerpo.match(new RegExp(`\\*\\*${nombre}:\\*\\*\\s*([^·\\n]+)`))?.[1].trim();

for (const issue of issues) {
    if (yaCargados.has(issue.number)) {
        console.log(`#${issue.number} ya estaba en el tablero`);
        continue;
    }
    const item = gh(["project", "item-add", numero, "--owner", config.owner, "--url", issue.url, "--format", "json"], { json: true });
    const esGuia = issue.labels.some((l) => l.name === "guía");
    const valores = { Status: esGuia ? "📌 Cómo trabajamos" : "Backlog" };
    if (!esGuia) {
        for (const nombre of Object.keys(CAMPOS)) {
            const valor = leerCampo(issue.body, nombre);
            if (valor) valores[nombre] = valor;
        }
    }
    for (const [campo, valor] of Object.entries(valores)) {
        const o = opcion(campo, valor);
        if (!o) {
            console.warn(`  #${issue.number}: "${valor}" no es una opción de ${campo}`);
            continue;
        }
        const fieldId = campos.find((c) => c.name === campo).id;
        gh(["project", "item-edit", "--id", item.id, "--project-id", proyecto.id,
            "--field-id", fieldId, "--single-select-option-id", o.id]);
    }
    console.log(`#${issue.number} ${issue.title} → ${valores.Status}`);

    if (asignar && !esGuia) {
        const login = RESPONSABLES[leerCampo(issue.body, "Responsable sugerido")];
        if (login) {
            try {
                gh(["issue", "edit", String(issue.number), "-R", config.repo, "--add-assignee", login]);
            } catch {
                console.warn(`  #${issue.number}: no pude asignar a ${login} (¿aceptó la invitación al repo?)`);
            }
        }
    }
}

// 5. Guardar el número del Project para scripts/tablero.mjs.
config.proyecto = proyecto.number;
writeFileSync(rutaConfig, JSON.stringify(config, null, 4) + "\n");
console.log(`\nListo. .github/tablero.json apunta al Project ${proyecto.number}: ${proyecto.url}`);
console.log("Falta a mano (GitHub no lo permite por API):");
console.log("  1. Cambiar la vista a Board, agrupada por Status.");
console.log("  2. Crear vistas filtradas: Backend (Área), Frontend (Área) y Por persona (agrupada por Assignees).");
console.log("  3. Settings → Workflows: que «Item closed» y «Pull request merged» muevan a «Hecho».");
