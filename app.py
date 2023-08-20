from flask import Flask, render_template, request, jsonify
from flask_caching import Cache
import json
import requests
from folium.plugins import MarkerCluster
import folium

app = Flask(__name__)

# Set up caching
cache = Cache(app, config={'CACHE_TYPE': 'simple'})

OVERPASS_URL = "http://overpass-api.de/api/interpreter"
RADIUS = 10000
DEFAULT_LOCATION = [-42.877250470859501, 147.29182659077199]









@cache.memoize(timeout=3600)  # Cache for 1 hour
def load_geojson(file_path):
    with open(file_path) as f:
        return json.load(f)

@cache.memoize(timeout=3600)  # Cache for 1 hour
def fetch_amenities_from_osm(latitude, longitude, amenity_type="restaurant", radius=RADIUS):
    query = f"""
    [out:json];
    (
        node["amenity"="{amenity_type}"](around:{radius},{latitude},{longitude});
        way["amenity"="{amenity_type}"](around:{radius},{latitude},{longitude});
        relation["amenity"="{amenity_type}"](around:{radius},{latitude},{longitude});
    );
    out center;
    """
    response = requests.get(OVERPASS_URL, params={'data': query})
    return response.json()['elements'] if response.status_code == 200 else []

@cache.memoize(timeout=3600)  # Cache for 1 hour
def geocode_address(address):
    base_url = "https://nominatim.openstreetmap.org/search"
    params = {
        'q': address + ", Hobart",
        'format': 'json',
        'limit': 1
    }
    response = requests.get(base_url, params=params)
    data = response.json()
    if data:
        return float(data[0]['lat']), float(data[0]['lon'])
    return None, None

@app.route('/search_address', methods=['POST'])
def search_address():
    address = request.form.get('address')
    lat, lon = geocode_address(address)
    if lat and lon:
        return jsonify({"status": "success", "lat": lat, "lon": lon})
    else:
        return jsonify({"status": "error", "message": "Unable to find the address"})

@app.route('/geojson/<path:file_path>')
def serve_geojson(file_path):
    return jsonify(load_geojson('data/' + file_path))


@app.route('/amenities')
def get_amenities():
    amenity_type = request.args.get('type', 'restaurant')
    lat = float(request.args.get('lat', DEFAULT_LOCATION[0]))
    lon = float(request.args.get('lon', DEFAULT_LOCATION[1]))

    if amenity_type == "tree":
        trees_geojson = load_geojson('data/TreesWithAssetID.geojson')
        # Convert the geojson to the format your JS expects and return
        # For now, we'll return the geojson directly
        return jsonify(trees_geojson)
    else:
        amenities = fetch_amenities_from_osm(lat, lon, amenity_type)
        return jsonify(amenities)


@app.route('/map')
def map_view():
    return render_template('map.html')


@app.route('/')
def index():

    return render_template('map.html')

if __name__ == '__main__':
    app.run(debug=True)
