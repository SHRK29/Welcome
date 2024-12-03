from flask import Flask, request, jsonify
import heapq
import googlemaps
from flask_cors import CORS

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

# Función para obtener coordenadas de una dirección
def get_coordinates(address):
    geocode_result = gmaps.geocode(address)
    if geocode_result:
        return geocode_result[0]['geometry']['location']
    else:
        return None

# Función de Dijkstra, ahora usando coordenadas para calcular la ruta
def dijkstra(graph, start, target):
    # Inicialización
    distances = {node: float('inf') for node in graph}
    distances[start] = 0
    priority_queue = [(0, start)]
    previous_nodes = {node: None for node in graph}
    
    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)

        if current_distance > distances[current_node]:
            continue

        for neighbor, weight in graph[current_node]:
            distance = current_distance + weight
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous_nodes[neighbor] = current_node
                heapq.heappush(priority_queue, (distance, neighbor))

    # Reconstruir la ruta
    path, current = [], target
    while current:
        path.append(current)
        current = previous_nodes[current]

    path.reverse()

    if distances[target] == float('inf'):
        return {"path": [], "cost": "No reachable path"}

    return {"path": path, "cost": distances[target]}

@app.route('/route', methods=['POST'])
def calculate_route():
    data = request.json
    start_coords = data.get("start_coords")  # Coordenadas del accidente
    target = data.get("target")  # Hospital seleccionado como destino

    # Verificar si las coordenadas de inicio están presentes
    if not start_coords or not target:
        return jsonify({"error": "Coordenadas o destino no válidos", "path": [], "cost": float('inf')}), 400
    
    # Verificar si el hospital destino está en el diccionario de hospitales
    if target not in hospitals:
        return jsonify({"error": f"El hospital '{target}' no es válido.", "path": [], "cost": float('inf')}), 400
    
    target_coords = hospitals[target]

    # Usar la API de Google Maps para calcular la distancia y la ruta
    directions_result = gmaps.directions(start_coords, target_coords, mode="driving")
    
    if directions_result:
        route = directions_result[0]['legs'][0]
        path = route['steps']
        total_cost = route['duration']['value']  # Duración en segundos como "coste"

        # Convertir los pasos de la ruta en una lista de calles o direcciones
        route_steps = [step['html_instructions'] for step in path]
        return jsonify({"path": route_steps, "cost": total_cost})
    else:
        return jsonify({"error": "No se pudo calcular la ruta", "path": [], "cost": float('inf')}), 400


if __name__ == '__main__':
    app.run(debug=True)
