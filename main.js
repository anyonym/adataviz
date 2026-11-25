import { filtrerNbPlaces, filtrerParQuartier, getCoordinates } from "./utils.js";
import { displayResults, displayFocus, retourListe } from "./display.js";


/* =====================================================
   1. CONFIGURATION DE L'APPLICATION
===================================================== */

const url = "https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_stationnement-deux-roues-motorises-ville-nantes/records?where=%22Centre%20Ville%22%20OR%20%22Hauts%22%20OR%20%22Ile%22&limit=100";

// Nombre de résultats affichés par page.
const resultatsParPage = 12;


/* =====================================================
   2. DONNÉES ET ÉTAT DE L'APPLICATION
===================================================== */

// Toutes les données récupérées depuis l'API.
let allStationnements = [];

// Résultats après application des filtres.
let filteredStationnements = [];

// Recherche par nombre de places.
let currentNbPlaces = "";

// Quartier actuellement sélectionné.
let currentFilter = null;

// Page actuellement affichée.
let currentPage = 1;


/* =====================================================
   3. CHARGEMENT DES DONNÉES
===================================================== */

/**
 * Récupère les stationnements depuis l'API Nantes Métropole.
 *
 * @returns {Promise<Array>}
 */
async function chargerDonnees() {
    try {
        const reponse = await fetch(url);

        if (!reponse.ok) {
            throw new Error(`Erreur HTTP ${reponse.status}`);
        }

        const donnees = await reponse.json();

        console.log(
            `${donnees.total_count ?? donnees.results?.length ?? 0} enregistrements au total`
        );

        return donnees.results ?? [];

    } catch (err) {
        console.error("Erreur de chargement :", err.message);
        return [];
    }
}


/* =====================================================
   4. FILTRAGE DES STATIONNEMENTS
===================================================== */

/**
 * Applique les filtres :
 * - Exclut les zones sans place disponible.
 * - Filtre par quartier.
 * - Filtre par nombre de places.
 *
 * Puis réinitialise la pagination et actualise l'affichage.
 */
function filtrerStationnements() {
    const stationnementsFiltres = allStationnements.filter(
        stationnement => {
            const nombrePlaces = Number(
                stationnement.nombre_place
            );

            // Exclusion des valeurs invalides ou sans place.
            if (
                !Number.isFinite(nombrePlaces) ||
                nombrePlaces <= 0
            ) {
                return false;
            }

            // Aucun filtre de quartier sélectionné.
            if (currentFilter === null) {
                return true;
            }

            const quartier = filtrerParQuartier(
                stationnement.quartier
            );

            // Centre-ville.
            if (currentFilter === "centre") {
                return quartier.includes("centre");
            }

            // Hauts-Pavés - Saint-Félix.
            if (currentFilter === "hpsf") {
                return (
                    quartier.includes("hauts") ||
                    quartier.includes("saint felix")
                );
            }

            // Île de Nantes.
            if (currentFilter === "ile") {
                return quartier.includes("ile");
            }

            return true;
        }
    );

    // Application du filtre par nombre de places.
    filteredStationnements = filtrerNbPlaces(
        stationnementsFiltres,
        currentNbPlaces
    );

    // Retour à la première page après un filtrage.
    currentPage = 1;

    // Mise à jour de l'affichage.
    afficherResultats();
}


/* =====================================================
   5. AFFICHAGE DES RÉSULTATS
===================================================== */

/**
 * Transmet les données filtrées à display.js.
 */
function afficherResultats() {
    displayResults(
        filteredStationnements,
        currentPage,
        resultatsParPage,
        displayFocus
    );
}


/* =====================================================
   6. GÉOCODAGE INVERSE : GPS VERS ADRESSE
===================================================== */

// Cache des adresses déjà récupérées.
const adressesEnCache = new Map();

// Gestion de la file des requêtes Nominatim.
let derniereRequete = 0;
let fileRequetes = Promise.resolve();

/**
 * Attend avant d'envoyer une requête Nominatim.
 * Maintient un intervalle d'environ une seconde
 * entre les requêtes de cette application.
 */
function attendreLimiteNominatim() {
    const requete = fileRequetes.then(async function() {
        const maintenant = Date.now();
        const delai = 1000 - (maintenant - derniereRequete);

        if (delai > 0) {
            await new Promise(resolve => {
                setTimeout(resolve, delai);
            });
        }

        derniereRequete = Date.now();
    });

    // La file continue même si une requête échoue.
    fileRequetes = requete.catch(() => {});

    return requete;
}

/**
 * Recherche une adresse à partir des coordonnées GPS.
 *
 * @param {Object} stationnement
 * @returns {Promise<string>}
 */
async function getAddress(stationnement) {
    const coordinates = getCoordinates(stationnement);

    if (!coordinates) {
        return "Coordonnées GPS indisponibles";
    }

    const { latitude, longitude } = coordinates;
    const cle = `${latitude},${longitude}`;

    // Utilisation du cache si l'adresse existe déjà.
    if (adressesEnCache.has(cle)) {
        return adressesEnCache.get(cle);
    }

    try {
        const parametres = new URLSearchParams({
            lat: latitude,
            lon: longitude,
            format: "jsonv2",
            addressdetails: "1",
            zoom: "18",
            "accept-language": "fr"
        });

        await attendreLimiteNominatim();

        const urlNominatim =
            `https://nominatim.openstreetmap.org/reverse?${parametres}`;

        const reponse = await fetch(urlNominatim);

        if (!reponse.ok) {
            throw new Error(
                `Erreur HTTP ${reponse.status} lors du géocodage`
            );
        }

        const donnees = await reponse.json();

        const adresse =
            donnees.display_name ?? "Adresse introuvable";

        // Enregistrement dans le cache.
        adressesEnCache.set(cle, adresse);

        return adresse;

    } catch (err) {
        console.error("Erreur de géocodage :", err.message);
        return "Adresse indisponible";
    }
}


/* =====================================================
   7. GESTION DES ÉVÉNEMENTS
===================================================== */

/**
 * Associe les événements aux éléments HTML.
 */
function initialiserEvenements() {
    // Boutons de filtre par quartier.
    document.querySelector("#centre").addEventListener(
        "click",
        function() {
            currentFilter = "centre";
            filtrerStationnements();
        }
    );

    document.querySelector("#hpsf").addEventListener(
        "click",
        function() {
            currentFilter = "hpsf";
            filtrerStationnements();
        }
    );

    document.querySelector("#ile").addEventListener(
        "click",
        function() {
            currentFilter = "ile";
            filtrerStationnements();
        }
    );

    // Recherche par nombre de places.
    document.querySelector("#recherche-places").addEventListener(
        "input",
        function(event) {
            currentNbPlaces = event.target.value.trim();
            filtrerStationnements();
        }
    );

    // Pagination : page précédente.
    document.querySelector("#btn-precedente").addEventListener(
        "click",
        function() {
            if (currentPage > 1) {
                currentPage--;
                afficherResultats();
            }
        }
    );

    // Pagination : page suivante.
    document.querySelector("#btn-suivante").addEventListener(
        "click",
        function() {
            const totalPages = Math.ceil(
                filteredStationnements.length / resultatsParPage
            );

            if (currentPage < totalPages) {
                currentPage++;
                afficherResultats();
            }
        }
    );

    // Retour à la liste.
    document.querySelector("#btn-retour").addEventListener(
        "click",
        retourListe
    );
}


/* =====================================================
   8. INITIALISATION DE L'APPLICATION
===================================================== */

/**
 * Charge les données puis initialise les filtres
 * et l'affichage.
 */
async function initialiserApplication() {
    initialiserEvenements();

    allStationnements = await chargerDonnees();

    filtrerStationnements();
}

// Démarrage de l'application.
initialiserApplication();