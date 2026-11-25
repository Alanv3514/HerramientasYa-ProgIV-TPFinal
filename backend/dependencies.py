from typing import Annotated

from fastapi import Depends
from sqlmodel import Session

from repositories.database import get_session

SessionDep = Annotated[Session, Depends(get_session)]

# Cada recurso suma acá abajo su XRepositoryDep y su XServiceDep, con el import debajo de SessionDep
# para evitar el ciclo dependencies ↔ repositories, como en la cátedra (ese import lleva noqa E402).
