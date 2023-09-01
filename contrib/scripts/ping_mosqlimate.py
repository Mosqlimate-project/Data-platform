import requests
import logging
import os


def send_discord_message(message: str) -> None:
    webhook = os.getenv("DISCORD_WEBHOOK")
    headers = {"Accept": "application/json", "Content-Type": "application/json"}

    resp = requests.post(webhook, headers=headers, json=dict(content=message))

    logging.warning(resp)


if __name__ == "__main__":
    URLs = [
        "https://api.mosqlimate.org",
        "https://api.mosqlimate.org/docs",
    ]

    for url in URLs:
        status = requests.get(url).status_code
        logging.info(f"{status} - {url}")
        if status >= 400 and status < 600:
            send_discord_message(f"🔴 `{status}` " + url)
