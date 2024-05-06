import requests


def get_map_bosses():
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
        map_name = map["name"]
        bosses = map["bosses"]
        map_bosses[map_name] = []
        for boss in bosses:
            name = boss["boss"]["name"]
            spawn_chance = boss["spawnChance"]
            if name in ["Raider", "Rogue"]:
                continue
            spawn_chance_percentage = spawn_chance * 100
            map_bosses[map_name].append((name, spawn_chance_percentage))

    for map_name, bosses in map_bosses.items():
        print(f"Map Name: {map_name}")
        for name, spawn_chance_percentage in bosses:
            print(f"  Boss Name: {name}, Spawn Chance: {spawn_chance_percentage}%")


# Call the function to execute the code
get_map_bosses()
