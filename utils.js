/* =====================================================
   1. NORMALISATION DES TEXTES
===================================================== */

/**
 * Normalise un texte pour faciliter les comparaisons.
 * Supprime les accents et les espaces inutiles.
 * Convertit les caractères en minuscules.
 */
export function normalizeText(text) {
    return String(text ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

/**
 * Normalise le nom d'un quartier.
 */
export function filtrerParQuartier(text) {
    return normalizeText(text);
}


/* =====================================================
   2. FILTRAGE PAR NOMBRE DE PLACES
===================================================== */

/**
 * Filtre les stationnements selon le nombre de places.
 *
 * La recherche accepte une correspondance partielle.
 * Exemple : "12" correspond à 12, 120 ou 125.
 */
export function filtrerNbPlaces(donnees, nbPlaces) {
    const recherche = normalizeText(nbPlaces);
    // Si aucune recherche n'est saisie,
    // on retourne toutes les données.
    if (!recherche) {
        return donnees;
    }
    return donnees.filter(stationnement => {
        const nombrePlaces = String(
            stationnement.nombre_place ?? ""
        );
        return normalizeText(nombrePlaces).includes(recherche);
    });
}


/* =====================================================
   3. RÉCUPÉRATION DES COORDONNÉES GPS
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
   4. CRÉATION DES MINI-CARTES OPENSTREETMAP
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
   5. LIMITATION DES REQUÊTES NOMINATIM
===================================================== */

let derniereRequete = 0;
let fileRequetes = Promise.resolve();

/**
 * Attend que la requête précédente soit terminée
 * et respecte un intervalle d'une seconde.
 */
function attendreLimiteNominatim() {
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
   6. GÉOCODAGE INVERSE : GPS VERS ADRESSE
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


/* =====================================================
   7. CRÉATION DES CARTES DE RÉSULTATS
===================================================== */

/**
 * Crée une carte HTML pour un stationnement.
 *
 * Elle contient :
 * - La commune
 * - Le quartier
 * - Le nombre de places
 * - Une mini-carte OpenStreetMap
 */
export function formaterDonnees(stationnement) {

    // Création de la carte principale
    const article = document.createElement("article");
    article.classList.add("carte");

    // Création du titre
    const titre = document.createElement("h3");
    titre.textContent =
        stationnement.commune ?? "Commune inconnue";

    // Création de la liste des informations
    const listeInformations = document.createElement("ul");

    // Création du quartier
    const quartier = document.createElement("li");
    quartier.classList.add("quartier");
    quartier.textContent =
        stationnement.quartier ?? "Non renseigné";

    // Création du nombre de places
    const nbPlaces = document.createElement("li");
    nbPlaces.classList.add("nbPlaces");
    nbPlaces.textContent =
        `${stationnement.nombre_place} places`;

    // Ajout des informations dans la liste
    listeInformations.append(quartier, nbPlaces);

    // Création de la mini-carte
    const miniCarte = creerMiniCarte(stationnement);

    // Assemblage de la carte
    article.append(
        titre,
        listeInformations
    );

    // Ajout de la mini-carte si les coordonnées existent
    if (miniCarte) {
        article.appendChild(miniCarte);
    }

    // Accessibilité de la carte au clavier
    article.tabIndex = 0;
    article.setAttribute("role", "button");
    article.setAttribute(
        "aria-label",
        `Voir le détail du stationnement ${stationnement.quartier ?? ""}`
    );
    // Retour de la carte HTML
    return article;
}
