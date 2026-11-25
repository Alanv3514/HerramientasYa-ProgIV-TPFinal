# Los servicios no conocen HTTP: avisan con estas excepciones y main.py las traduce a un código.


class ErrorDeDominio(Exception):
    """Base: un mensaje para el usuario final, en español (RNF-10)."""


class ReglaDeNegocioError(ErrorDeDominio):  # 400: se violó una RN-xx
    pass


class NoEsDuenioError(ErrorDeDominio):  # 403: RNF-03
    pass


class CuentaNoHabilitadaError(ErrorDeDominio):  # 403: usuario PENDIENTE o SUSPENDIDO (RF-02, RN-10)
    pass


class ConflictoError(ErrorDeDominio):  # 409: duplicado o fechas superpuestas (RN-04)
    pass
