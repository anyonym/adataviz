import { chargerDonnees, filtrerParQuartier, getCoordinates, normalizeText, formaterDonnees, filtrerNbPlaces } from "./utils.js"
// import utils from "./utils.js"


/* =====================================================
   1. CONFIGURATION GÉNÉRALE
===================================================== */

// Nombre de cartes affichées par page
const resultatsParPage = 12;

/* =====================================================
   2. RÉCUPÉRATION DES ÉLÉMENTS HTML
===================================================== */

const resultsContainer = document.querySelector(".results");
const totalResults = document.querySelector("#total-results p");
const searchPlacesInput = document.querySelector("#recherche-places");
const focusSection = document.querySelector(".focus");
const focusCard = document.querySelector(".focus .carte");
const previousButton = document.querySelector("#btn-precedente");
const nextButton = document.querySelector("#btn-suivante");
const filtre = {
    centre: document.querySelector("#centre"),
    hpsf: document.querySelector("#hpsf"),
    ile: document.querySelector("#ile")
};

/* =====================================================
   3. VARIABLES DU PROGRAMME
===================================================== */

// Ensemble des données récupérées depuis l'API
let allStationnements = [];

// Résultats après filtrage
let filteredStationnements = [];

// Page actuellement affichée
let currentPage = 1;

// Quartier actuellement sélectionné
// null signifie que tous les quartiers sont affichés
let currentFilter = null;

// Nombre de places recherché
let currentNbPlaces = "";

/* =====================================================
   4. FILTRAGE DES STATIONNEMENTS
===================================================== */

/**
 * Exclut les zones sans place disponible,
 * applique le filtre de quartier et le filtre
 * sur le nombre de places.
 */
function filtrerStationnements() {

    // Filtrage des données par quartier
    const stationnementsFiltres = allStationnements.filter(stationnement => {
        const nombrePlaces = Number(stationnement.nombre_place);
        // Exclusion des zones à zéro place
        if (!Number.isFinite(nombrePlaces) || nombrePlaces <= 0) {
            return false;
        }
        // Aucun filtre de quartier
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
    // Retour à la première page après un filtrage
    currentPage = 1;
    displayResults();
}

/* =====================================================
   5. BONUS : CRÉATION D'UNE MINI-CARTE OPENSTREETMAP
===================================================== */


/* =====================================================
   6. BONUS : GÉOCODAGE INVERSE : GPS VERS ADRESSE
===================================================== */


/* =====================================================
   7. AFFICHAGE DE LA FICHE DÉTAILLÉE
===================================================== */

/**
 * Remplit la carte présente dans la section .focus.
 *
 * Cette carte contient également :
 * - Les coordonnées GPS
 * - L'adresse complète
 * - Une mini-carte
 */
async function displayFocus(stationnement) {

    // Récupération des éléments HTML existants
    const titre = focusCard.querySelector("h3");
    const quartier = focusCard.querySelector(".quartier");
    const nbPlaces = focusCard.querySelector(".nbPlaces");
    const latitudeElement = focusCard.querySelector(".lat");
    const longitudeElement = focusCard.querySelector(".lon");

    // Mise à jour des informations
    titre.textContent =
        stationnement.commune ?? "Commune inconnue";
    quartier.textContent =
        stationnement.quartier ?? "Non renseigné";
    nbPlaces.textContent =
        `${stationnement.nombre_place} places`;
    const coordinates = getCoordinates(stationnement);
    latitudeElement.textContent =
        coordinates?.latitude ?? "Non renseigné";
    longitudeElement.textContent =
        coordinates?.longitude ?? "Non renseigné";

    // Affichage de la fiche
    focusSection.classList.remove("cache");
    focusCard.classList.remove("cache");

    // Masquage de la navigation et des résultats
document.querySelector("#nav").classList.add("cache");
document.querySelector("#total-results").classList.add("cache");
resultsContainer.classList.add("cache");
document.querySelector("#pages").classList.add("cache");
}

/* =====================================================
   8. RETOUR À LA LISTE DES RÉSULTATS
===================================================== */

function retourListe() {
    focusSection.classList.add("cache");
    focusCard.classList.add("cache");
    // Réaffichage de la navigation et des résultats
    document.querySelector("#nav").classList.remove("cache");
    document.querySelector("#total-results").classList.remove("cache");
    resultsContainer.classList.remove("cache");
    document.querySelector("#pages").classList.remove("cache");
}

/* =====================================================
   9. AFFICHAGE DES RÉSULTATS
===================================================== */

/**
 * Affiche les résultats de la page actuelle.
 * Affiche un message si aucun résultat ne correspond.
 */
function displayResults() {

    // Suppression des anciennes cartes
    resultsContainer.replaceChildren();

    // Vérification de l'absence de résultats
    if (filteredStationnements.length === 0) {
        resultsContainer.textContent =
            "Aucune zone de stationnement ne correspond.";
        updateCounter(0);
        updatePagination();
        return;
    }

    // Calcul des positions de début et de fin
    const startIndex = (currentPage - 1) * resultatsParPage;

    const endIndex = startIndex + resultatsParPage;

    // Extraction des résultats de la page
    const pageResults = filteredStationnements.slice(
        startIndex,
        endIndex
    );

    // Création des cartes
    pageResults.forEach(stationnement => {

        const carte = formaterDonnees(stationnement, displayFocus);

        resultsContainer.appendChild(carte);
    });

    // Mise à jour du compteur
    updateCounter(filteredStationnements.length);

    // Mise à jour de la pagination
    updatePagination();
}

/* =====================================================
   10. MISE À JOUR DU COMPTEUR (AVEC BONUS)
===================================================== */

function updateCounter(nombre) {
    totalResults.textContent =
        `Nombre de résultats : ${nombre}`;
}

/* =====================================================
   11. BONUS : GESTION DE LA PAGINATION
===================================================== */

/**
 * Calcule le nombre de pages et adapte les boutons.
 */
function updatePagination() {
    const totalPages = Math.ceil(
        filteredStationnements.length / resultatsParPage
    );
    // Affichage du bouton précédent uniquement
    // à partir de la deuxième page.
    previousButton.classList.toggle(
        "cache",
        currentPage <= 1
    );
    // Affichage du bouton suivant uniquement
    // s'il existe une page supplémentaire.
    nextButton.classList.toggle(
        "cache",
        currentPage >= totalPages
    );
}


/* =====================================================
   12. BONUS : NAVIGATION ENTRE LES PAGES
===================================================== */

// Page précédente
previousButton.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        displayResults();
    }
});

// Page suivante
nextButton.addEventListener("click", () => {
    const totalPages = Math.ceil(
        filteredStationnements.length / resultatsParPage
    );
    if (currentPage < totalPages) {
        currentPage++;
        displayResults();
    }
});

/* =====================================================
   13. FILTRAGE PAR QUARTIER
===================================================== */

filtre.centre.addEventListener("click", () => {
    currentFilter = "centre";
    filtrerStationnements();
});

filtre.hpsf.addEventListener("click", () => {
    currentFilter = "hpsf";
    filtrerStationnements();
});

filtre.ile.addEventListener("click", () => {
    currentFilter = "ile";
    filtrerStationnements();
});

// Recherche dynamique par nombre de places
searchPlacesInput.addEventListener("input", event => {
    currentNbPlaces = event.target.value.trim();
    filtrerStationnements();
});

/* =====================================================
   14. BOUTON RETOUR
===================================================== */

document.querySelector("#btn-retour")
    .addEventListener("click", retourListe);

/* =====================================================
   15. LANCEMENT DU PROGRAMME
===================================================== */

async function initialiserApplication() {
    allStationnements = await chargerDonnees();
    filteredStationnements = allStationnements;
    filtrerStationnements();
}

initialiserApplication();
