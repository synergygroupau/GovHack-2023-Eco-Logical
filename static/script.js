function initLeaflet() {
    const DEFAULT_LOCATION = [-42.877250470859501, 147.29182659077199];
    const ZOOM_START = 15;

    let map = L.map('map').setView(DEFAULT_LOCATION, ZOOM_START);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    document.getElementById("search-btn").addEventListener("click", function(e) {
        e.preventDefault();

        let address = document.getElementById("search-input").value;

        fetch('/search_address', {
            method: 'POST',
            body: new URLSearchParams(`address=${address}`),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                let latlng = L.latLng(data.lat, data.lon);
                map.flyTo(latlng, ZOOM_START);

                document.getElementById("address").textContent = `Address: ${address}`;
                document.getElementById("latitude").textContent = data.lat;
                document.getElementById("longitude").textContent = data.lon;
                document.getElementById("popup").style.display = "block";
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('There was an error with the address search:', error);
        });
    });

    const dataFilesWithDetails = [
        ['Building_Footprints.geojson', 'black'],
        ['C12_0_Flood_Prone_Hazard_Areas_Code.geojson', 'blue'],
        ['Bushfire_prone_locations.geojson', 'orange'],
        ['Hobart_Interim_Planning_Scheme_2015_Overlays.geojson', 'orange']
    ];

    dataFilesWithDetails.forEach(([filePath, color]) => {
        fetch(`/geojson/${filePath}`)
            .then(response => response.json())
            .then(data => {
                L.geoJSON(data, {
                    style: { color: color }
                }).addTo(map);
            });
    });

    const amenitiesData = [
        ["hospital", "green", "plus"],
        ["school", "blue", "graduation-cap"],
        ["shop", "red", "shopping-cart"]
    ];

    amenitiesData.forEach(([type, color, icon]) => {
        fetch(`/amenities?type=${type}`)
            .then(response => response.json())
            .then(data => {
                data.forEach(amenity => {
                    if (amenity.lat && amenity.lon) {
                        L.marker([amenity.lat, amenity.lon], {
                            icon: L.icon({ iconUrl: `path_to_icons/${icon}.png`, iconSize: [25, 41], iconAnchor: [12, 41] })
                        }).addTo(map).bindPopup(amenity.tags ? amenity.tags.name : "");
                    }
                });
            });
    });

    // Fetch and display tree data as clustered markers
    const treeCluster = L.markerClusterGroup({ iconCreateFunction: function(cluster) {
        return L.divIcon({ html: `<span>${cluster.getChildCount()}</span>`, className: 'marker-cluster marker-cluster-large', iconSize: L.point(40, 40) });
    }});
    
    fetch(`/amenities?type=tree`)
        .then(response => response.json())
        .then(data => {
            data.features.forEach(tree => {
                if (tree.geometry && tree.geometry.coordinates) {
                    const coords = tree.geometry.coordinates;
                    L.marker([coords[1], coords[0]], {
                        icon: L.icon({ iconUrl: 'tree.png', iconSize: [25, 41], iconAnchor: [12, 41] })
                    }).addTo(treeCluster);
                }
            });
            map.addLayer(treeCluster);
        });
}

document.addEventListener("DOMContentLoaded", initLeaflet);
