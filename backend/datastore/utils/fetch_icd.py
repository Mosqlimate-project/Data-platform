"""
This script contains helper functions to fetch WHO ICD diseases.

Example of usage:
```
get_diseases(
    root_url="https://id.who.int/icd/release/10/2010/",
    client_id=...,
    client_secret=...,
    language="pt"
)
```
"""

import asyncio
import httpx
from pydantic import BaseModel
from typing import Optional, AsyncGenerator

MAX_WORKERS = 20


class DiseaseSchema(BaseModel):
    code: str
    name: str
    description: Optional[str] = None


async def get_auth_token(client_id: str, client_secret: str) -> str:
    token_url = "https://icdaccessmanagement.who.int/connect/token"
    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
        "scope": "icdapi_access",
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=payload)
        response.raise_for_status()
        return response.json().get("access_token")


def parse_disease(data: dict) -> Optional[DiseaseSchema]:
    code = data.get("code")
    title = data.get("title")

    if isinstance(title, dict):
        name = title.get("@value")
    else:
        name = title

    if not code or not name:
        return None

    return DiseaseSchema(
        code=code,
        name=name,
        description=data.get("definition", {}).get("@value", None),
    )


async def worker(
    name: str,
    queue: asyncio.Queue,
    result_queue: asyncio.Queue,
    token: str,
    client: httpx.AsyncClient,
    language: str,
):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Accept-Language": language,
        "API-Version": "v2",
    }

    while True:
        try:
            url = await queue.get()
            clean_url = url.replace("http:", "https:")

            response = await client.get(clean_url, headers=headers)

            if response.status_code == 200:
                data = response.json()
                disease = parse_disease(data)

                if disease:
                    await result_queue.put(disease)

                children = data.get("child", [])
                for child in children:
                    queue.put_nowait(child)

        except asyncio.CancelledError:
            break
        except Exception:
            pass
        finally:
            queue.task_done()


async def get_diseases(
    root_url: str,
    client_id: str,
    client_secret: str,
    language: str = "en",
) -> AsyncGenerator[DiseaseSchema, None]:
    todo = asyncio.Queue()
    result = asyncio.Queue()
    todo.put_nowait(root_url)

    token = await get_auth_token(client_id, client_secret)

    async with httpx.AsyncClient(timeout=60.0) as client:
        workers = [
            asyncio.create_task(
                worker(
                    f"w-{i}",
                    todo,
                    result,
                    token,
                    client,
                    language,
                )
            )
            for i in range(MAX_WORKERS)
        ]

        async def monitor():
            await todo.join()
            await result.put(None)

        monitor_task = asyncio.create_task(monitor())

        try:
            while True:
                disease = await result.get()
                if disease is None:
                    break
                yield disease

        finally:
            for w in workers:
                w.cancel()

            monitor_task.cancel()
            await asyncio.gather(
                *workers, monitor_task, return_exceptions=True
            )
