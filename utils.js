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
   6. CRÉATION DES CARTES DE RÉSULTATS
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
