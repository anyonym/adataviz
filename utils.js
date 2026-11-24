/* =====================================================
   1. RÉCUPÉRATION DES DONNÉES
===================================================== */

export async function chargerDonnees(url) {
    try {
        const reponse = await fetch(url);
        // Vérification de la réponse de l'API
        if (!reponse.ok) {
            throw new Error("Erreur HTTP " + reponse.status);
        }
        const donnees = await reponse.json();
        console.log(
            donnees.total_count + " enregistrements au total"
        );
        return donnees.results ?? [];
    } catch (err) {
        console.error("Erreur de chargement :", err.message);
        return [];
    }
}


/* =====================================================
   2. NORMALISATION DES TEXTES
===================================================== */

/**
 * Normalise un texte pour faciliter les comparaisons.
 * Supprime les accents et les espaces inutiles.
 * Convertit les caractères en minuscules.
 */
export function filtrerParQuartier(text) {
    return String(text ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


/* =====================================================
   3. FILTRAGE PAR NOMBRE DE PLACES
===================================================== */

/**
 * Filtre les stationnements selon le nombre de places.
 * La recherche accepte une correspondance partielle.
 * Exemple : "12" correspond à 12, 120 ou 125.
 */
export function filtrerNbPlaces(donnees, nbPlaces) {
    const recherche = filtrerParQuartier(nbPlaces);
    // Si aucune recherche n'est saisie,
    // on retourne toutes les données.
    if (!recherche) {
        return donnees;
    }
    return donnees.filter(stationnement => {
        const nombrePlaces = String(
            stationnement.nombre_place ?? ""
        );

        return filtrerParQuartier(nombrePlaces).includes(recherche);
    });
}


/* =====================================================
   5. RÉCUPÉRATION DES COORDONNÉES GPS
===================================================== */

/**
 * Récupère les coordonnées GPS d'un stationnement.
 */
export function getCoordinates(stationnement) {
    const latitude = Number(stationnement.geo_point_2d?.lat);
    const longitude = Number(stationnement.geo_point_2d?.lon);

    // Vérification de la validité des coordonnées
    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return null;
    }
    return {
        latitude,
        longitude
    };
}


/* =====================================================
   6. CRÉATION DES MINI-CARTES OPENSTREETMAP
===================================================== */

/**
 * Crée une mini-carte OpenStreetMap à partir
 * des coordonnées GPS d'un stationnement.
 */
export function creerMiniCarte(stationnement, nomClasse = "mini-carte") {
    // Récupération des coordonnées GPS
    const coordinates = getCoordinates(stationnement);

    // Vérification des coordonnées
    if (!coordinates) {
        return null;
    }

    const latitude = coordinates.latitude;
    const longitude = coordinates.longitude;

    // Définition de la zone affichée sur la carte
    const ecartLatitude = 0.0015;
    const ecartLongitude =
        ecartLatitude *
        (16 / 9) *
        Math.cos(latitude * Math.PI / 180);

    // Calcul des limites de la carte
    const ouest = longitude - ecartLongitude;
    const est = longitude + ecartLongitude;
    const sud = latitude - ecartLatitude;
    const nord = latitude + ecartLatitude;

    // Préparation des paramètres de l'URL
    const parametres = new URLSearchParams({
        bbox: `${ouest},${sud},${est},${nord}`,
        layer: "mapnik",
        marker: `${latitude},${longitude}`
    });

    // Création de l'iframe
    const iframe = document.createElement("iframe");
    iframe.src =
        `https://www.openstreetmap.org/export/embed.html?${parametres}`;

    // Personnalisation de l'iframe
    iframe.classList.add(nomClasse);
    iframe.title =
        `Localisation du stationnement dans le quartier ${stationnement.quartier ?? ""}`;

    iframe.loading = "lazy";
    iframe.setAttribute("allowfullscreen", "");

    // Retour de la carte HTML
    return iframe;
}


/* =====================================================
   7. LIMITATION DES REQUÊTES NOMINATIM
===================================================== */

let derniereRequete = 0;
let fileRequetes = Promise.resolve();

/**
 * Attend que la requête précédente soit terminée
 * et respecte un intervalle d'une seconde.
 */
export function attendreLimiteNominatim() {
    const requete = fileRequetes.then(async function() {
        const maintenant = Date.now();
        const delai = 1000 - (maintenant - derniereRequete);

        if (delai > 0) {
            await new Promise(function(resolve) {
                setTimeout(resolve, delai);
            });
        }
        derniereRequete = Date.now();
    });
    fileRequetes = requete.catch(function() {});
    return requete;
}


/* =====================================================
   8. GÉOCODAGE INVERSE : GPS VERS ADRESSE
===================================================== */

// Stockage des adresses déjà récupérées
const adressesEnCache = new Map();

/**
 * Recherche une adresse à partir des coordonnées GPS.
 */
export async function getAddress(stationnement) {
    // Récupération des coordonnées GPS
    const coordinates = getCoordinates(stationnement);

    // Vérification des coordonnées
    if (!coordinates) {
        return "Coordonnées GPS indisponibles";
    }

    const latitude = coordinates.latitude;
    const longitude = coordinates.longitude;

    // Création d'une clé pour retrouver une adresse en cache
    const cle = `${latitude},${longitude}`;

    // Vérification si l'adresse existe déjà
    if (adressesEnCache.has(cle)) {
        return adressesEnCache.get(cle);
    }

    try {
        // Préparation des paramètres de recherche
        const parametres = new URLSearchParams({
            lat: latitude,
            lon: longitude,
            format: "jsonv2",
            addressdetails: "1",
            zoom: "18",
            "accept-language": "fr"
        });

        await attendreLimiteNominatim();

        // Construction de l'URL
        const url = `https://nominatim.openstreetmap.org/reverse?${parametres}`;

        // Envoi de la requête à Nominatim
        const reponse = await fetch(url);

        // Vérification de la réponse
        if (!reponse.ok) {
            throw new Error("Erreur lors de la recherche de l'adresse");
        }

        // Conversion de la réponse en objet JavaScript
        const donnees = await reponse.json();

        // Récupération de l'adresse complète
        const adresse = donnees.display_name ?? "Adresse introuvable";

        // Enregistrement de l'adresse dans le cache
        adressesEnCache.set(cle, adresse);

        return adresse;

    } catch (err) {
        console.error("Erreur de géocodage :", err.message);
        return "Adresse indisponible";
    }
}