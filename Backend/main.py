from flask import Flask, request, jsonify
import heapq
import googlemaps
from flask_cors import CORS
import os
import math

app = Flask(__name__)
CORS(app)  # Habilitar CORS

gmaps = googlemaps.Client(key='AIzaSyDgsYuYXRfV0vgqZiVVgMt09IkAjkXqds4')

hospitals = {
    "Centro De Cancerología De Boyacá": {"lat": 5.5391, "lng": -73.3644},
    "Clinica Chia S.A.": {"lat": 5.5370, "lng": -73.3672},
    "Hospital universitario San Rafael": {"lat": 5.5358, "lng": -73.3682},
    "Clinica Los Andes": {"lat": 5.5314, "lng": -73.3669},
    "E.S.E Santiago de Tunja": {"lat": 5.5350, "lng": -73.3678},
    "Hospital Metropolitano Santiago de Tunja": {"lat": 5.5321, "lng": -73.3652},
    "Clínica Medilaser S.A.": {"lat": 5.5367, "lng": -73.3665},
    "Bomberos Tunja": {"lat": 5.5345, "lng": -73.3681},
    "Sub-Estacion De Bomberos Z2": {"lat": 5.5373, "lng": -73.3683},
    "Sub Estación Sur Luis Alberto Pedreros": {"lat": 5.5341, "lng": -73.3694}
}

def haversine_distance(coord1, coord2):
    R = 6371  # Radio de la Tierra en kilómetros
    lat1, lon1 = math.radians(coord1['lat']), math.radians(coord1['lng'])
    lat2, lon2 = math.radians(coord2['lat']), math.radians(coord2['lng'])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def dijkstra(start_coords, target):
    distances = {hospital: float('inf') for hospital in hospitals}
    previous = {hospital: None for hospital in hospitals}
    pq = [(0, start_coords, None)]

    while pq:
        current_distance, current_coords, current_hospital = heapq.heappop(pq)

        if current_hospital == target:
            path = []
            while current_hospital:
                path.append(current_hospital)
                current_hospital = previous[current_hospital]
            return {"path": list(reversed(path)), "cost": current_distance}

        if current_hospital and current_distance > distances[current_hospital]:
            continue

        for hospital, coords in hospitals.items():
            distance = current_distance + haversine_distance(current_coords, coords)
            if distance < distances[hospital]:
                distances[hospital] = distance
                previous[hospital] = current_hospital
                heapq.heappush(pq, (distance, coords, hospital))

    return {"path": [], "cost": float('inf')}

@app.route('/route', methods=['POST'])
def calculate_route():
    data = request.json
    start_coords = data.get("start_coords")
    target = data.get("target")

    if not start_coords or not target:
        return jsonify({"error": "Coordenadas o destino no válidos", "path": [], "cost": float('inf')}), 400

    if target not in hospitals:
        return jsonify({"error": f"El hospital '{target}' no es válido.", "path": [], "cost": float('inf')}), 400

    result = dijkstra(start_coords, target)

    if result["path"]:
        # Usar la API de Google Maps para obtener las direcciones detalladas
        waypoints = [hospitals[hospital] for hospital in result["path"]]
        directions_result = gmaps.directions(
            start_coords,
            waypoints[-1],
            waypoints=waypoints[:-1],
            mode="driving"
        )

        if directions_result:
            route = directions_result[0]['legs'][0]
            steps = []
            for step in route['steps']:
                steps.append(step['html_instructions'])
            return jsonify({"path": steps, "cost": result["cost"]})

    return jsonify({"error": "No se pudo calcular la ruta", "path": [], "cost": float('inf')}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)

