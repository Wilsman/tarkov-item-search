import os
import json
import time
import requests
from datetime import datetime, timezone
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
app.config["DEBUG"] = os.environ.get("FLASK_DEBUG") == "True"
API_KEY = os.environ.get("API_KEY")
CACHE_TIME = 1800  # Cache duration in seconds (30 minutes)
PVE_CACHE_FILE = "item_cache_pve.json"
PVP_CACHE_FILE = "item_cache_pvp.json"
MAP_BOSSES_CACHE_DURATION = 1800  # Cache duration in seconds (30 minutes)

# Global variables
pve_mode_enabled = True

# Add these constants
MAP_BOSSES_CACHE_FILE = "map_bosses_cache.json"
MAP_BOSSES_CACHE_DURATION = 1800  # Cache duration in seconds (30 minutes)

# Remove these global variables
# map_bosses_cache = None
# map_bosses_cache_time = None


def fetch_items(pve_toggle):
    url = (
        f"https://api.tarkov-market.app/api/v1/{'pve/' if pve_toggle else ''}items/all"
    )
    headers = {"x-api-key": API_KEY}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    raise Exception(f"Failed to fetch items: {response.status_code}")


def cache_items(items, cache_file):
    with open(cache_file, "w") as cache:
        json.dump(items, cache)


def load_cached_items(cache_file):
    if os.path.exists(cache_file):
        with open(cache_file, "r") as cache:
            return (
                json.load(cache),
                time.time() - os.path.getmtime(cache_file) < CACHE_TIME,
            )
    return [], False


def get_cache_times():
    cache_times = {}
    now = datetime.now(timezone.utc)

    for cache_file in [PVE_CACHE_FILE, PVP_CACHE_FILE, MAP_BOSSES_CACHE_FILE]:
        if os.path.exists(cache_file):
            cache_time = datetime.fromtimestamp(
                os.path.getmtime(cache_file), timezone.utc
            )
            time_diff = now - cache_time
            cache_times[cache_file] = {
                "formatted": cache_time.strftime("%Y-%m-%d %H:%M:%S UTC"),
                "relative": format_timedelta(time_diff),
            }
        else:
            cache_times[cache_file] = {
                "formatted": "File does not exist",
                "relative": "N/A",
            }

    return cache_times


def format_timedelta(td):
    seconds = int(td.total_seconds())
    if seconds < 60:
        return f"{seconds} seconds ago"
    elif seconds < 3600:
        return f"{seconds // 60} minutes ago"
    elif seconds < 86400:
        return f"{seconds // 3600} hours ago"
    else:
        return f"{seconds // 86400} days ago"


@app.route("/toggle_pve", methods=["POST"])
def toggle_pve():
    global pve_mode_enabled
    data = request.get_json()
    pve_mode_enabled = data.get("pve_toggle", True)
    return jsonify({"status": "success", "pve_mode": pve_mode_enabled})


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/map_bosses")
def map_bosses():
    try:
        cached_data = load_cached_map_bosses()
        if cached_data:
            return jsonify(
                {"map_bosses": cached_data, "cache_times": get_cache_times()}
            )

        query = """
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

        response = requests.post(
            "https://api.tarkov.dev/graphql",
            headers={"Content-Type": "application/json"},
            json={"query": query},
        )

        if response.status_code != 200:
            app.logger.error(
                f"API request failed with status code: {response.status_code}"
            )
            app.logger.error(f"Response content: {response.text}")
            return jsonify({"error": "Failed to fetch map bosses data"}), 500

        data = response.json()
        if "data" not in data or "maps" not in data["data"]:
            app.logger.error(f"Unexpected API response structure: {data}")
            return jsonify({"error": "Unexpected API response structure"}), 500

        maps = data["data"]["maps"]
        map_bosses = {}

        for map_data in maps:
            if map_data["name"] in ["The Lab", "Ground Zero"]:
                continue
            map_name = map_data["name"]
            map_bosses[map_name] = [
                (boss["boss"]["name"], round(boss["spawnChance"] * 100))
                for boss in map_data["bosses"]
                if boss["boss"]["name"] not in ["Raider", "Rogue"]
            ]

        cache_map_bosses(map_bosses)

        return jsonify({"map_bosses": map_bosses, "cache_times": get_cache_times()})
    except Exception as e:
        app.logger.error(f"An error occurred in map_bosses(): {str(e)}")
        return jsonify({"error": "An unexpected error occurred"}), 500


@app.route("/search")
def perform_search():
    query = request.args.get("query", "").lower()
    pve_mode = request.args.get("pve", "false").lower() == "true"
    cache_file = PVE_CACHE_FILE if pve_mode else PVP_CACHE_FILE

    items, using_cache = load_cached_items(cache_file)

    if not using_cache:
        items = fetch_items(pve_mode)
        cache_items(items, cache_file)

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
            "wikiLink": item.get("wikiLink", "#"),  # Add this line
        }
        for item in items
        if query in item["name"].lower()
    ][:20]

    return jsonify(
        {
            "items": filtered_items,
            "using_cache": using_cache,
            "cache_times": get_cache_times(),
        }
    )


@app.route("/cache_times")
def cache_times():
    return jsonify(get_cache_times())


def load_cached_map_bosses():
    if os.path.exists(MAP_BOSSES_CACHE_FILE):
        with open(MAP_BOSSES_CACHE_FILE, "r") as cache_file:
            cached_data = json.load(cache_file)
            if time.time() - cached_data["timestamp"] < MAP_BOSSES_CACHE_DURATION:
                return cached_data["data"]
    return None


def cache_map_bosses(map_bosses):
    cache_data = {"timestamp": time.time(), "data": map_bosses}
    with open(MAP_BOSSES_CACHE_FILE, "w") as cache_file:
        json.dump(cache_data, cache_file)


if __name__ == "__main__":
    print(json.dumps(get_cache_times(), indent=2))
    app.run(
        debug=app.config["DEBUG"],
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "5000")),
    )
