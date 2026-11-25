import { getCoordinates } from "./utils.js";


/* =====================================================
   1. RÉCUPÉRATION DES ÉLÉMENTS HTML
===================================================== */

// Zone contenant les cartes de résultats.
const resultsContainer = document.querySelector(".results");

// Compteur de résultats.
const totalResults = document.querySelector("#total-results p");

// Section de la fiche détaillée.
const focusSection = document.querySelector(".focus");

// Carte de la fiche détaillée.
const focusCard = document.querySelector(".focus .carte");

// Navigation et pagination.
const nav = document.querySelector("#nav");
const pages = document.querySelector("#pages");

// Boutons de pagination.
const previousButton = document.querySelector("#btn-precedente");
const nextButton = document.querySelector("#btn-suivante");

// Bouton de retour à la liste.
const returnButton = document.querySelector("#btn-retour");

// Conteneur de la mini-carte de la fiche détaillée.
const miniCarteContainer = focusCard.querySelector(
    ".conteneur-mini-carte-focus"
);

// Identifiant de la dernière fiche sélectionnée.
// Permet d'éviter les problèmes liés aux requêtes asynchrones.
let numeroSelection = 0;


/* =====================================================
   2. CRÉATION DES MINI-CARTES OPENSTREETMAP
===================================================== */

/**
 * Crée une mini-carte OpenStreetMap.
 *
 * @param {Object} stationnement
 * @param {string} nomClasse
 * @returns {HTMLIFrameElement|null}
 */
function creerMiniCarte(
    stationnement,
    nomClasse = "mini-carte"
) {
    const coordinates = getCoordinates(stationnement);

    // Pas de carte si les coordonnées sont invalides.
    if (!coordinates) {
        return null;
    }

    const { latitude, longitude } = coordinates;

    // Définition de la zone affichée.
    const ecartLatitude = 0.0015;

    const ecartLongitude =
        ecartLatitude *
        (16 / 9) *
        Math.cos(latitude * Math.PI / 180);

    // Calcul des limites de la carte.
    const ouest = longitude - ecartLongitude;
    const est = longitude + ecartLongitude;
    const sud = latitude - ecartLatitude;
    const nord = latitude + ecartLatitude;

    const parametres = new URLSearchParams({
        bbox: `${ouest},${sud},${est},${nord}`,
        layer: "mapnik",
        marker: `${latitude},${longitude}`
    });

    const iframe = document.createElement("iframe");

    iframe.src =
        `https://www.openstreetmap.org/export/embed.html?${parametres}`;

    iframe.classList.add(nomClasse);

    iframe.title =
        `Localisation du stationnement dans le quartier ${stationnement.quartier ?? ""}`;

    iframe.loading = "lazy";
    iframe.setAttribute("allowfullscreen", "");

    return iframe;
}


/* =====================================================
   3. CRÉATION DES CARTES DE RÉSULTATS
===================================================== */

/**
 * Crée une carte HTML pour un stationnement.
 *
 * @param {Object} stationnement
 * @returns {HTMLElement}
 */
function formaterDonnees(stationnement) {
    const article = document.createElement("article");
    article.classList.add("carte");

    // Titre de la carte.
    const titre = document.createElement("h3");
    titre.textContent =
        stationnement.commune ?? "Commune inconnue";

    // Liste des informations.
    const listeInformations = document.createElement("ul");

    // Quartier.
    const quartier = document.createElement("li");
    quartier.classList.add("quartier");
    quartier.textContent =
        stationnement.quartier ?? "Non renseigné";

    // Nombre de places.
    const nbPlaces = document.createElement("li");
    nbPlaces.classList.add("nbPlaces");
    nbPlaces.textContent =
        `${stationnement.nombre_place ?? 0} places`;

    listeInformations.append(quartier, nbPlaces);

    // Mini-carte.
    const miniCarte = creerMiniCarte(stationnement);

    // Assemblage de la carte.
    article.append(titre, listeInformations);

    if (miniCarte) {
        article.appendChild(miniCarte);
    }

    // Accessibilité au clavier.
    article.tabIndex = 0;
    article.setAttribute("role", "button");

    article.setAttribute(
        "aria-label",
        `Voir le détail du stationnement ${stationnement.quartier ?? ""}`
    );

    return article;
}


/* =====================================================
   4. AFFICHAGE DES RÉSULTATS
===================================================== */

/**
 * Affiche les stationnements de la page actuelle.
 *
 * @param {Array} stationnements - Données filtrées.
 * @param {number} pageActuelle - Page à afficher.
 * @param {number} resultatsParPage - Nombre de cartes par page.
 * @param {Function} onSelect - Fonction appelée à la sélection.
 */
export function displayResults(
    stationnements,
    pageActuelle,
    resultatsParPage,
    onSelect
) {
    // Suppression des anciennes cartes.
    resultsContainer.replaceChildren();

    // Mise à jour du compteur.
    updateCounter(stationnements.length);

    // Calcul du nombre de pages.
    const totalPages = Math.ceil(
        stationnements.length / resultatsParPage
    );

    updatePagination(pageActuelle, totalPages);

    // Aucun résultat.
    if (stationnements.length === 0) {
        resultsContainer.textContent =
            "Aucune zone de stationnement ne correspond.";
        return;
    }

    // Calcul des indices de début et de fin.
    const startIndex =
        (pageActuelle - 1) * resultatsParPage;

    const endIndex = startIndex + resultatsParPage;

    const pageResults = stationnements.slice(
        startIndex,
        endIndex
    );

    // Création et affichage des cartes.
    pageResults.forEach(stationnement => {
        const carte = formaterDonnees(stationnement);

        // Sélection au clic.
        carte.addEventListener("click", function() {
            onSelect(stationnement, getAddressForDisplay);
        });

        // Sélection au clavier.
        carte.addEventListener("keydown", function(event) {
            if (
                event.key === "Enter" ||
                event.key === " "
            ) {
                event.preventDefault();
                onSelect(stationnement, getAddressForDisplay);
            }
        });

        resultsContainer.appendChild(carte);
    });
}


/* =====================================================
   5. FICHE DÉTAILLÉE
===================================================== */

/**
 * Fonction intermédiaire permettant de transmettre
 * le service de géocodage depuis main.js.
 *
 * Elle est remplacée par le service fourni lors
 * de l'appel à displayFocus.
 */
let getAddressForDisplay = async function() {
    return "Adresse indisponible";
};

/**
 * Affiche la fiche détaillée d'un stationnement.
 *
 * @param {Object} stationnement
 * @param {Function} getAddress - Fonction de géocodage.
 */
export async function displayFocus(
    stationnement,
    getAddress
) {
    numeroSelection++;

    const selectionActuelle = numeroSelection;

    // Mise à jour de la fonction de géocodage.
    getAddressForDisplay = getAddress;

    const titre = focusCard.querySelector("h3");
    const quartier = focusCard.querySelector(".quartier");
    const nbPlaces = focusCard.querySelector(".nbPlaces");
    const latitudeElement = focusCard.querySelector(".lat");
    const longitudeElement = focusCard.querySelector(".lon");
    const adresseElement = focusCard.querySelector(".adresse");

    // Informations du stationnement.
    titre.textContent =
        stationnement.commune ?? "Commune inconnue";

    quartier.textContent =
        stationnement.quartier ?? "Non renseigné";

    nbPlaces.textContent =
        `${stationnement.nombre_place ?? 0} places`;

    // Coordonnées GPS.
    const coordinates = getCoordinates(stationnement);

    latitudeElement.textContent =
        coordinates?.latitude ?? "Non renseigné";

    longitudeElement.textContent =
        coordinates?.longitude ?? "Non renseigné";

    // Message temporaire pendant le géocodage.
    adresseElement.textContent = "Recherche de l'adresse...";

    // Création de la mini-carte de la fiche.
    const miniCarte = creerMiniCarte(
        stationnement,
        "mini-carte-focus"
    );

    miniCarteContainer.replaceChildren();

    if (miniCarte) {
        miniCarteContainer.appendChild(miniCarte);
    } else {
        miniCarteContainer.textContent =
            "Carte indisponible : coordonnées GPS manquantes.";
    }

    // Affichage de la fiche.
    focusSection.classList.remove("cache");
    focusCard.classList.remove("cache");

    // Masquage de la liste.
    nav.classList.add("cache");
    totalResults.parentElement.classList.add("cache");
    resultsContainer.classList.add("cache");
    pages.classList.add("cache");

    // Recherche de l'adresse.
    const adresse = await getAddress(stationnement);

    // Vérification que la fiche n'a pas changé entre-temps.
    if (selectionActuelle !== numeroSelection) {
        return;
    }

    adresseElement.textContent = adresse;
}


/* =====================================================
   6. RETOUR À LA LISTE
===================================================== */

/**
 * Masque la fiche détaillée et réaffiche la liste.
 */
export function retourListe() {
    // Invalide les anciennes recherches d'adresse.
    numeroSelection++;

    focusSection.classList.add("cache");
    focusCard.classList.add("cache");

    nav.classList.remove("cache");
    totalResults.parentElement.classList.remove("cache");
    resultsContainer.classList.remove("cache");
    pages.classList.remove("cache");
}


/* =====================================================
   7. COMPTEUR DE RÉSULTATS
===================================================== */

/**
 * Affiche le nombre de résultats trouvés.
 *
 * @param {number} nombre
 */
function updateCounter(nombre) {
    totalResults.textContent =
        `${nombre} zones de stationnement trouvées`;
}


/* =====================================================
   8. PAGINATION VISUELLE
===================================================== */

/**
 * Met à jour l'affichage des boutons de pagination.
 *
 * @param {number} pageActuelle
 * @param {number} totalPages
 */
function updatePagination(pageActuelle, totalPages) {
    previousButton.classList.toggle(
        "cache",
        pageActuelle <= 1
    );

    nextButton.classList.toggle(
        "cache",
        pageActuelle >= totalPages
    );
}