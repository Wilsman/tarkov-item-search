import os
import json
import time
import requests
from datetime import datetime
from flask_cors import CORS
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# get env variables
app.config["DEBUG"] = os.environ.get("FLASK_DEBUG")

CACHE_FILE = "item_cache.json"
CACHE_TIME = 3600  # Cache duration in seconds

# Define a global variable for the PvE toggle state
pve_mode_enabled = True  # Default value


def fetch_and_cache_items(pve_toggle):
    cache_file = "item_cache_pve.json" if pve_toggle else "item_cache_pvp.json"
    if (
        not os.path.exists(cache_file)
        or time.time() - os.path.getmtime(cache_file) >= CACHE_TIME
    ):
        headers = {"x-api-key": os.environ.get("API_KEY")}
        url = (
            "https://api.tarkov-market.app/api/v1/pve/items/all"
            if pve_toggle
            else "https://api.tarkov-market.app/api/v1/items/all"
        )
        print(f"Fetching items from {url}")
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            items = response.json()
            with open(cache_file, "w") as cache:
                json.dump(items, cache)
        else:
            raise Exception(f"Failed to fetch items: {response.status_code}")


# Call the function for both PVP and PVE at the start
fetch_and_cache_items(True)  # For PVE
fetch_and_cache_items(False)  # For PVP


@app.route("/toggle_pve", methods=["POST"])
def toggle_pve():
    global pve_mode_enabled  # Declare the use of the global variable
    data = request.get_json()
    pve_mode_enabled = data.get("pve_toggle", True)
    print(f"pve_toggle updated to: {pve_mode_enabled}")

    # # Delete the cache file if it exists
    # cache_file = "item_cache_pve.json" if pve_mode_enabled else "item_cache_pvp.json"
    # if os.path.exists(cache_file):
    #     os.remove(cache_file)

    return jsonify({"status": "success"})


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/map_bosses")
def map_bosses():
    def run_query(query):
        headers = {"Content-Type": "application/json"}
        response = requests.post(
            "https://api.tarkov.dev/graphql", headers=headers, json={"query": query}
        )
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(
                "Query failed to run by returning code of {}. {}".format(
                    response.status_code, query
                )
            )

    new_query = """
    {
        maps {
            name
            bosses {
                boss {
                    name
                    normalizedName
                }
                spawnChance
            }
        }
    }
    """

    result = run_query(new_query)

    maps = result["data"]["maps"]

    map_bosses = {}

    for map in maps:
        if map["name"] in ["The Lab", "Ground Zero"]:
            continue
        map_name = map["name"]
        bosses = map["bosses"]
        map_bosses[map_name] = []
        for boss in bosses:
            name = boss["boss"]["name"]
            spawn_chance = boss["spawnChance"]
            if name in ["Raider", "Rogue"]:
                continue
            if name == "Death Knight":
                name = "Goons"  # Modify the name here
            spawn_chance_percentage = spawn_chance * 100
            map_bosses[map_name].append((name, spawn_chance_percentage))

    return jsonify(map_bosses)


@app.route("/search")
def perform_search():
    query = request.args.get("query", "").lower()
    pve_mode = request.args.get("pve", "false").lower() == "true"

    cache_file = "item_cache_pve.json" if pve_mode else "item_cache_pvp.json"

    def load_items_from_cache():
        try:
            with open(cache_file, "r") as cache:
                last_fetch_time = os.path.getmtime(cache_file)
                items = json.load(cache)
                return items, time.time() - last_fetch_time < CACHE_TIME
        except (FileNotFoundError, json.JSONDecodeError):
            return [], False

    items, using_cache = load_items_from_cache()

    if not using_cache:
        fetch_and_cache_items(pve_mode)
        items, _ = load_items_from_cache()
        print("Fetched and cached data")

    filtered_items = [
        {
            "name": item["name"],
            "shortName": item["shortName"],
            "price": item["price"],
            "icon": item.get("icon", "No icon available"),
            "traderName": item.get("traderName", "No trader available"),
            "traderPrice": item.get("traderPrice", "No trader price available"),
            "traderPriceCur": item.get(
                "traderPriceCur", "No trader price currency available"
            ),
            "updated": item.get("updated", "No update available"),
        }
        for item in items
        if query in item["name"].lower()
    ][
        :20
    ]  # Correctly slice the first 20 items

    return jsonify({"items": filtered_items, "using_cache": using_cache})


if __name__ == "__main__":
    app.run(
        debug=os.environ.get("FLASK_DEBUG"),
        host="0.0.0.0",
        port=int(os.environ.get("PORT")),
    )
