export async function routeRoutes(app) {
  app.post('/', async (req) => {
    const { start, end, avoid_features } = req.body;
    if (!start || !end) {
      return { error: 'Missing start [lng,lat] and end [lng,lat]' };
    }

    const apiKey = process.env.ORS_API_KEY;

    // ORS wheelchair routing (pokud máme klíč)
    if (apiKey) {
      const orsUrl = process.env.ORS_URL || 'https://api.openrouteservice.org';
      const body = {
        coordinates: [start, end],
        profile: 'wheelchair',
        format: 'geojson',
        instructions: true,
        language: 'cs',
        options: {
          profile_params: {
            restrictions: {
              surface_type: 'cobblestone:flattened',
              track_type: 'grade1',
              smoothness_type: 'good',
              maximum_sloped_kerb: 0.03,
              maximum_incline: 6
            }
          },
          avoid_features: avoid_features || ['steps']
        }
      };

      const response = await fetch(`${orsUrl}/v2/directions/wheelchair/geojson`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        return response.json();
      }
      app.log.warn(`ORS failed (${response.status}), falling back to OSRM`);
    }

    // Fallback: OSRM foot routing (veřejný, bez klíče)
    const osrmUrl = `https://router.project-osrm.org/route/v1/foot/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(osrmUrl);
    if (!response.ok) {
      return { error: `Routing failed: ${response.status}` };
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      return { error: 'Trasa nenalezena' };
    }

    const route = data.routes[0];

    // Převod OSRM formátu na GeoJSON kompatibilní s frontendem
    return {
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: route.geometry,
        properties: {
          summary: {
            distance: route.distance,
            duration: route.duration
          },
          segments: [{
            distance: route.distance,
            duration: route.duration,
            steps: route.legs[0].steps.map(s => ({
              distance: s.distance,
              duration: s.duration,
              instruction: s.maneuver.type === 'depart' ? 'Vyjed' :
                           s.maneuver.type === 'arrive' ? 'Cil' :
                           s.maneuver.modifier ? `Odboc ${s.maneuver.modifier === 'left' ? 'vlevo' : s.maneuver.modifier === 'right' ? 'vpravo' : s.maneuver.modifier}` :
                           'Pokracuj',
              name: s.name || ''
            }))
          }],
          way_points: [0, route.geometry.coordinates.length - 1],
          engine: 'osrm-foot',
          warning: 'Pesi trasa (bez wheelchair profilu). Pro presnejsi bezbarierovy routing nastavte ORS_API_KEY.'
        }
      }],
      metadata: { engine: 'osrm', profile: 'foot' }
    };
  });
}
