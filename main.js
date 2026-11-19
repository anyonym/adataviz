import { creerMiniCarte, getAddress, getCoordinates, normalizeText, formaterDonnees, filtrerNbPlaces } from "./utils.js";


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
async function chargerDonnees() {
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

// Nombre de cartes affichées par page
const resultatsParPage = 12;


/* =====================================================
   3. RÉCUPÉRATION DES ÉLÉMENTS HTML
===================================================== */

// Zone contenant les cartes
const resultsContainer = document.querySelector(".results");
// Compteur de résultats
const totalResults = document.querySelector("#total-results p");
// Champ de recherche
const searchPlacesInput = document.querySelector("#recherche-places");
// Section de la fiche détaillée
const focusSection = document.querySelector(".focus");
// Carte de la fiche détaillée
const focusCard = document.querySelector(".focus .carte");
// Navigation
const nav = document.querySelector("#nav");
const pages = document.querySelector("#pages");
// Boutons de pagination
const previousButton = document.querySelector("#btn-precedente");
const nextButton = document.querySelector("#btn-suivante");
// Bouton de retour
const returnButton = document.querySelector("#btn-retour");
// Boutons de filtrage par quartier
const filtre = {
    centre: document.querySelector("#centre"),
    hpsf: document.querySelector("#hpsf"),
    ile: document.querySelector("#ile")
};
const miniCarteContainer = focusCard.querySelector(
    ".conteneur-mini-carte-focus"
);


/* =====================================================
   4. VARIABLES DU PROGRAMME
===================================================== */

// Toutes les données récupérées depuis l'API
let allStationnements = [];
// Résultats après filtrage
let filteredStationnements = [];
// Page actuellement affichée
let currentPage = 1;
// Quartier actuellement sélectionné
let currentFilter = null;
// Nombre de places recherché
let currentNbPlaces = "";
// Identifiant de la dernière fiche sélectionnée
let numeroSelection = 0;


/* =====================================================
   5. FILTRAGE DES STATIONNEMENTS
===================================================== */

/**
 * Filtre les stationnements :
 * - Exclut les zones sans place disponible.
 * - Applique le filtre de quartier.
 * - Applique le filtre sur le nombre de places.
 */
function filtrerStationnements() {
    // Filtrage des données par quartier
    const stationnementsFiltres = allStationnements.filter(stationnement => {
        const nombrePlaces = Number(stationnement.nombre_place);
        // Exclusion des zones sans place disponible
        if (!Number.isFinite(nombrePlaces) || nombrePlaces <= 0) {
            return false;
        }
        // Aucun filtre de quartier sélectionné
        if (currentFilter === null) {
            return true;
        }
        const quartier = normalizeText(stationnement.quartier);
        // Filtre Centre-ville
        if (currentFilter === "centre") {
            return quartier.includes("centre");
        }
        // Filtre Hauts-Pavés - Saint-Félix
        if (currentFilter === "hpsf") {
            return quartier.includes("hauts") ||
                   quartier.includes("saint felix");
        }
        // Filtre Île de Nantes
        if (currentFilter === "ile") {
            return quartier.includes("ile");
        }
        return true;
    });
    // Application du filtre sur le nombre de places
    filteredStationnements = filtrerNbPlaces(
        stationnementsFiltres,
        currentNbPlaces
    );
    // Retour à la première page
    currentPage = 1;
    displayResults();
}


/* =====================================================
   6. AFFICHAGE DES RÉSULTATS
===================================================== */

/**
 * Affiche les stationnements de la page actuelle.
 */
function displayResults() {
    // Suppression des anciennes cartes
    resultsContainer.replaceChildren();
    // Vérification de l'absence de résultats
    if (filteredStationnements.length === 0) {
        resultsContainer.textContent = "Aucune zone de stationnement ne correspond.";
        updateCounter(0);
        updatePagination();
        return;
    }
    // Calcul de la position du premier résultat
    const startIndex = (currentPage - 1) * resultatsParPage;
    // Calcul de la position du dernier résultat
    const endIndex = startIndex + resultatsParPage;
    // Récupération des résultats de la page actuelle
    const pageResults = filteredStationnements.slice(
        startIndex,
        endIndex
    );
    // Création et affichage des cartes
    pageResults.forEach(stationnement => {
        // Création de la carte HTML
        const carte = formaterDonnees(stationnement);
        // Ouverture de la fiche détaillée au clic
        carte.addEventListener("click", function() {
            displayFocus(stationnement);
        });
        // Ouverture de la fiche détaillée au clavier
        carte.addEventListener("keydown", function(event) {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                displayFocus(stationnement);
            }
        });
        // Ajout de la carte dans la page
        resultsContainer.appendChild(carte);
    });
    // Mise à jour du compteur
    updateCounter(filteredStationnements.length);
    // Mise à jour de la pagination
    updatePagination();
}


/* =====================================================
   7. AFFICHAGE DE LA FICHE DÉTAILLÉE
===================================================== */


/**
 * Affiche les informations détaillées d'un stationnement.
 * Recherche également son adresse à partir des coordonnées GPS.
 */
async function displayFocus(stationnement) {
    // Identification de la sélection actuelle
    numeroSelection++;
    const selectionActuelle = numeroSelection;
    // Récupération des éléments HTML
    const titre = focusCard.querySelector("h3");
    const quartier = focusCard.querySelector(".quartier");
    const nbPlaces = focusCard.querySelector(".nbPlaces");
    const latitudeElement = focusCard.querySelector(".lat");
    const longitudeElement = focusCard.querySelector(".lon");
    const adresseElement = focusCard.querySelector(".adresse");
    // Mise à jour des informations du stationnement
    titre.textContent =
        stationnement.commune ?? "Commune inconnue";
    quartier.textContent =
        stationnement.quartier ?? "Non renseigné";
    nbPlaces.textContent =
        `${stationnement.nombre_place} places`;
    // Récupération des coordonnées GPS
    const coordinates = getCoordinates(stationnement);
    latitudeElement.textContent =
        coordinates?.latitude ?? "Non renseigné";
    longitudeElement.textContent =
        coordinates?.longitude ?? "Non renseigné";
    // Affichage d'un message pendant la recherche
    adresseElement.textContent = "Recherche de l'adresse...";
    // Création de la mini-carte
    const miniCarte = creerMiniCarte(
        stationnement,
        "mini-carte-focus"
    );
    // Suppression de l'ancienne carte
    miniCarteContainer.replaceChildren();

    // Affichage de la nouvelle carte
    if (miniCarte) {
        miniCarteContainer.appendChild(miniCarte);
    } else {
        miniCarteContainer.textContent = "Carte indisponible : coordonnées GPS manquantes.";
    }

    // Affichage de la fiche détaillée
    focusSection.classList.remove("cache");
    focusCard.classList.remove("cache");
    // Masquage de la liste des résultats
    nav.classList.add("cache");
    totalResults.parentElement.classList.add("cache");
    resultsContainer.classList.add("cache");
    pages.classList.add("cache");
    // Recherche de l'adresse avec Nominatim
    const adresse = await getAddress(stationnement);
    // Vérification que la fiche sélectionnée est toujours la même
    if (selectionActuelle !== numeroSelection) {
        return;
    }
    // Affichage de l'adresse
    adresseElement.textContent = adresse;
}


/* =====================================================
   8. RETOUR À LA LISTE DES RÉSULTATS
===================================================== */

/**
 * Masque la fiche détaillée et réaffiche les résultats.
 */
function retourListe() {
    // Annulation logique d'une ancienne recherche d'adresse 
    // La requête Nominatim peut encore être en cours. 
    // L'incrémentation de numeroSelection permet d'empêcher son résultat de modifier une fiche qui n'est plus sélectionnée.
    numeroSelection++;
    // Masquage de la fiche détaillée
    focusSection.classList.add("cache");
    focusCard.classList.add("cache");
    // Réaffichage de la navigation
    nav.classList.remove("cache");
    totalResults.parentElement.classList.remove("cache");
    resultsContainer.classList.remove("cache");
    pages.classList.remove("cache");
}


/* =====================================================
   9. MISE À JOUR DU COMPTEUR
===================================================== */

/**
 * Affiche le nombre total de résultats.
 */
function updateCounter(nombre) {
    totalResults.textContent =
        `${nombre} zones de stationement trouvées`;
}


/* =====================================================
   10. GESTION DE LA PAGINATION
===================================================== */

/**
 * Calcule le nombre de pages disponibles.
 * Affiche ou masque les boutons de navigation.
 */
function updatePagination() {
    const totalPages = Math.ceil(
        filteredStationnements.length / resultatsParPage
    );
    // Bouton précédent
    previousButton.classList.toggle(
        "cache",
        currentPage <= 1
    );
    // Bouton suivant
    nextButton.classList.toggle(
        "cache",
        currentPage >= totalPages
    );
}


/* =====================================================
   11. GESTION DES ÉVÉNEMENTS
===================================================== */

/* ---------- Pagination ---------- */

// Page précédente
previousButton.addEventListener("click", function() {
    if (currentPage > 1) {
        currentPage--;
        displayResults();
    }
});

// Page suivante
nextButton.addEventListener("click", function() {
    const totalPages = Math.ceil(
        filteredStationnements.length / resultatsParPage
    );
    if (currentPage < totalPages) {
        currentPage++;
        displayResults();
    }
});

/* ---------- Filtrage par quartier ---------- */

// Centre-ville
filtre.centre.addEventListener("click", function() {
    currentFilter = "centre";
    filtrerStationnements();
});

// Hauts-Pavés - Saint-Félix
filtre.hpsf.addEventListener("click", function() {
    currentFilter = "hpsf";
    filtrerStationnements();
});

// Île de Nantes
filtre.ile.addEventListener("click", function() {
    currentFilter = "ile";
    filtrerStationnements();
});

/* ---------- Recherche par nombre de places ---------- */

searchPlacesInput.addEventListener("input", function(event) {
    currentNbPlaces = event.target.value.trim();
    filtrerStationnements();
});

/* ---------- Bouton retour ---------- */

returnButton.addEventListener("click", retourListe);


/* =====================================================
   12. INITIALISATION DE L'APPLICATION
===================================================== */

/**
 * Charge les données et lance l'affichage.
 */
async function initialiserApplication() {
    // Récupération des données depuis l'API
    allStationnements = await chargerDonnees();
    // Application des filtres et affichage
    filtrerStationnements();
}
// Lancement de l'application
initialiserApplication();
