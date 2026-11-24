import { chargerDonnees, filtrerNbPlaces, filtrerParQuartier } from "./utils.js";
import { displayResults } from "./display.js";


/* =====================================================
INITIALISATION DE L'APPLICATION
===================================================== */

const url = "https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_stationnement-deux-roues-motorises-ville-nantes/records?where=%22Centre%20Ville%22%20OR%20%22Hauts%22%20OR%20%22Ile%22&limit=100";

// Toutes les données récupérées depuis l'API
let allStationnements = [];
// Quartier actuellement sélectionné
let currentFilter = null;
// Nombre de places recherché
let currentNbPlaces = "";
// Résultats après filtrage
export let filteredStationnements = [];
// Page actuellement affichée
export let currentPage = 1;


/**
 * Filtre les stationnements :
 * - Exclut les zones sans place disponible.
 * - Applique le filtre de quartier.
 * - Applique le filtre sur le nombre de places.
 */
export function filtrerStationnements() {
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
        const quartier = filtrerParQuartier(stationnement.quartier);
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

/**
 * Charge les données et lance l'affichage.
 */
async function initialiserApplication() {
    // Récupération des données depuis l'API
    allStationnements = await chargerDonnees(url);
    // Application des filtres et affichage
    filtrerStationnements();
}
// Lancement de l'application
initialiserApplication();