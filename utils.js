/* =====================================================
   1. CONFIGURATION DE L'API
===================================================== */

const url = "https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_stationnement-deux-roues-motorises-ville-nantes/records?select=gid%2C%20commune%2C%20quartier%2C%20nombre_place%2C%20geo_point_2d&where=%22Centre%20Ville%22%20OR%20%22Ile%20de%20Nantes%22%20OR%20%22Hauts%20Pav%C3%A9s%20Saint%20F%C3%A9lix%22&limit=100";


/* =====================================================
   2. RÉCUPÉRATION DES DONNÉES
===================================================== */

/**
 * Récupère les données depuis l'API.
 * Transforme la réponse en objet JavaScript.
 */
export async function chargerDonnees() {
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
   3. NORMALISATION DES TEXTES
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
   4. FILTRAGE PAR NOMBRE DE PLACES
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
   6. LIMITATION DES REQUÊTES NOMINATIM
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
   7. GÉOCODAGE INVERSE : GPS VERS ADRESSE
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
   8. CRÉATION DES CARTES DE RÉSULTATS
===================================================== */

/**
 * Crée une carte HTML pour un stationnement.
 *
 * Elle contient :
 * - La commune
 * - Le quartier
 * - Le nombre de places
 *
 * Cette fonction crée uniquement la carte.
 * Les événements sont gérés dans main.js.
 */
export function formaterDonnees(stationnement) {
    // Création de la carte principale
    const article = document.createElement("article");
    article.classList.add("carte");
    // Création du titre : commune
    const titre = document.createElement("h3");
    titre.textContent =
        stationnement.commune ?? "Commune inconnue";
    // Création de la liste des informations
    const listeInformations = document.createElement("ul");
    // Création de l'information : quartier
    const quartier = document.createElement("li");
    quartier.classList.add("quartier");
    quartier.textContent =
        stationnement.quartier ?? "Non renseigné";
    // Création de l'information : nombre de places
    const nbPlaces = document.createElement("li");
    nbPlaces.classList.add("nbPlaces");
    nbPlaces.textContent =
        `${stationnement.nombre_place} places`;
    // Ajout des informations dans la liste
    listeInformations.append(quartier, nbPlaces);
    // Assemblage de la carte
    article.append(
        titre,
        listeInformations
    );
    // Accessibilité de la carte au clavier
    article.tabIndex = 0;
    article.setAttribute("role", "button");
    article.setAttribute(
        "aria-label",
        `Voir le détail du stationnement ${stationnement.quartier ?? ""}`
    );
    // Retourne la carte HTML créée
    return article;
}
