function LimpiarMapaControl(controlDiv, map) {
  const controlUI = document.createElement('div');
  controlUI.style.backgroundColor = '#fff';
  controlUI.style.border = '2px solid #fff';
  controlUI.style.borderRadius = '3px';
  controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
  controlUI.style.cursor = 'pointer';
  controlUI.style.marginTop = '10px';
  controlUI.style.marginRight = '10px';
  controlUI.style.textAlign = 'center';
  controlUI.title = 'Haz clic para limpiar el mapa';
  controlDiv.appendChild(controlUI);

  const controlText = document.createElement('div');
  controlText.style.color = 'rgb(25,25,25)';
  controlText.style.fontFamily = 'Roboto,Arial,sans-serif';
  controlText.style.fontSize = '16px';
  controlText.style.lineHeight = '38px';
  controlText.style.paddingLeft = '5px';
  controlText.style.paddingRight = '5px';
  controlText.innerHTML = 'Limpiar Mapa';
  controlUI.appendChild(controlText);

  controlUI.addEventListener('click', limpiarMapa);
}let map;
let marcadorAccidente = null;
let directionsService;
let directionsRenderer;
let marcadoresHospitales = [];

const hospitales = {
    "Centro De Cancerología De Boyacá": { lat: 5.552517, lng: -73.346096 },
    "Clinica Chia S.A.": { lat: 5.554223367371707, lng: -73.34619501138893 },
    "Hospital universitario San Rafael": { lat: 5.540834874452216, lng: -73.3610883272055 },
    "Clinica Los Andes": { lat: 5.544412253256696, lng: -73.3596720820669 },
    "E.S.E Santiago de Tunja": { lat: 5.528694520365881, lng: -73.36240875676042 },
    "Hospital Metropolitano Santiago de Tunja": { lat: 5.520359509203265, lng: -73.35806358685134 },
    "Clínica Medilaser S.A.": { lat: 5.570590425179761, lng: -73.33692994689878 }
  };

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 5.5353, lng: -73.3678 },
    zoom: 14
  });

  const limpiarMapaDiv = document.createElement('div');
  const limpiarMapaControl = new LimpiarMapaControl(limpiarMapaDiv, map);

  limpiarMapaDiv.index = 1;
  map.controls[google.maps.ControlPosition.TOP_RIGHT].push(limpiarMapaDiv);

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: true,
    polylineOptions: {
      strokeColor: '#FF0000'
    }
  });
  directionsRenderer.setMap(map);

  for (const [nombre, coords] of Object.entries(hospitales)) {
    const marker = new google.maps.Marker({
      position: coords,
      map: map,
      title: nombre,
      icon: 'http://maps.google.com/mapfiles/kml/shapes/hospitals.png'
    });
    marcadoresHospitales.push(marker);
  }

  google.maps.event.addListener(map, 'click', function(event) {
    const coords = event.latLng;
    if (marcadorAccidente) {
      marcadorAccidente.setMap(null);
    }
    marcadorAccidente = new google.maps.Marker({
        position: coords,
        map: map,
        title: "Accidente",
        icon: 'http://maps.google.com/mapfiles/kml/shapes/caution.png'
    });
    document.getElementById('direccionAccidente').value = `${coords.lat()}, ${coords.lng()}`;

    directionsRenderer.setDirections({routes: []});
    const hospitalCercano = encontrarHospitalCercano(coords);
    document.getElementById('hospitalDestino').value = hospitalCercano;

    calcularRuta();
  });

  const selectHospital = document.getElementById('hospitalDestino');
  for (const hospital in hospitales) {
    const option = document.createElement('option');
    option.value = hospital;
    option.textContent = hospital;
    selectHospital.appendChild(option);
  }
}

function encontrarHospitalCercano(coordenadas) {
  let hospitalCercano = null;
  let distanciaMinima = Infinity;

  for (const [nombre, coords] of Object.entries(hospitales)) {
    const distancia = google.maps.geometry.spherical.computeDistanceBetween(
      coordenadas,
      new google.maps.LatLng(coords.lat, coords.lng)
    );

    if (distancia < distanciaMinima) {
      distanciaMinima = distancia;
      hospitalCercano = nombre;
    }
  }

  return hospitalCercano;
}

function geocodificarDireccion(direccion, callback) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ 'address': direccion }, function(results, status) {
    if (status === google.maps.GeocoderStatus.OK) {
      callback(results[0].geometry.location);
    } else {
      alert("Error al geocodificar la dirección: " + status);
    }
  });
}

function calcularRuta() {
  const direccionAccidente = document.getElementById('direccionAccidente').value;
  const hospitalDestino = document.getElementById('hospitalDestino').value;

  marcadoresHospitales.forEach(marcador => marcador.setMap(null));
  marcadoresHospitales = [];

  geocodificarDireccion(direccionAccidente, function(accidenteCoords) {
    if (marcadorAccidente) {
      marcadorAccidente.setMap(null);
    }
    marcadorAccidente = new google.maps.Marker({
        position: accidenteCoords,
        map: map,
        title: "Accidente",
        icon: 'http://maps.google.com/mapfiles/kml/shapes/caution.png'
      });

    fetch('https://rutas.onrender.com/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        start_coords: {
          lat: accidenteCoords.lat(),
          lng: accidenteCoords.lng()
        },
        target: hospitalDestino
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.path && data.path.length > 0) {
        console.log('Ruta recibida:', data);
        
        const rutaGoogleMaps = new google.maps.DirectionsService();
        const renderizadorRuta = new google.maps.DirectionsRenderer({
          map: map,
          suppressMarkers: true
        });

        const hospitalCoords = hospitales[hospitalDestino];
        const request = {
          origin: accidenteCoords,
          destination: hospitalCoords,
          travelMode: 'DRIVING'
        };

        rutaGoogleMaps.route(request, function(result, status) {
          if (status === 'OK') {
            renderizadorRuta.setDirections(result);
            
            new google.maps.Marker({
              position: accidenteCoords,
              map: map,
              title: "Accidente",
              icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
            });
            new google.maps.Marker({
              position: hospitalCoords,
              map: map,
              title: hospitalDestino,
              icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            });

            const bounds = new google.maps.LatLngBounds();
            bounds.extend(accidenteCoords);
            bounds.extend(hospitalCoords);
            map.fitBounds(bounds);

            const rutaHtml = result.routes[0].legs[0].steps.map(step => step.instructions).join('<br>');
            const infoWindow = new google.maps.InfoWindow({
              content: `<div><strong>Instrucciones:</strong><br>${rutaHtml}</div>`
            });
            infoWindow.open(map, marcadorAccidente);

            const distancia = result.routes[0].legs[0].distance.text;
            const duracion = result.routes[0].legs[0].duration.text;
            alert(`Distancia: ${distancia}\nDuración estimada: ${duracion}`);
          }
        });
      } else {
        console.log('Error:', data.error);
        alert('Error al calcular la ruta. Por favor, intente de nuevo.');
      }
    })
    .catch(error => {
      console.error('Error al calcular la ruta:', error);
      alert('Error de conexión. Por favor, verifique su conexión a internet e intente de nuevo.');
    });
  });
}function limpiarMapa() {
  if (marcadorAccidente) {
    marcadorAccidente.setMap(null);
    marcadorAccidente = null;
  }
  directionsRenderer.setDirections({routes: []});

  document.getElementById('direccionAccidente').value = '';

  map.setZoom(14);
  map.setCenter({ lat: 5.5353, lng: -73.3678 });
  if (infoWindow) {
    infoWindow.close();
  }
}
