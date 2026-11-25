/* =====================================================
   1. NORMALISATION DES TEXTES
===================================================== */

/**
 * Normalise un texte pour faciliter les comparaisons.
 * - Convertit en chaîne de caractères.
 * - Supprime les accents.
 * - Convertit en minuscules.
 * - Supprime les espaces au début et à la fin.
 */
export function filtrerParQuartier(text) {
    return String(text ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}


/* =====================================================
   2. FILTRAGE PAR NOMBRE DE PLACES
===================================================== */

/**
 * Filtre les stationnements selon le nombre de places.
 *
 * La recherche accepte une correspondance partielle :
 * "12" correspond à 12, 120 ou 125.
 *
 * @param {Array} donnees - Liste des stationnements.
 * @param {string|number} nbPlaces - Recherche saisie.
 * @returns {Array} Liste filtrée.
 */
export function filtrerNbPlaces(donnees, nbPlaces) {
    const recherche = filtrerParQuartier(nbPlaces);

    // Aucune recherche : on retourne toutes les données.
    if (!recherche) {
        return donnees;
    }

    return donnees.filter(stationnement => {
        const nombrePlaces = filtrerParQuartier(
            stationnement.nombre_place
        );

        return nombrePlaces.includes(recherche);
    });
}


/* =====================================================
   3. RÉCUPÉRATION DES COORDONNÉES GPS
===================================================== */

/**
 * Récupère et vérifie les coordonnées GPS d'un stationnement.
 *
 * Cette fonction est pure : elle ne modifie pas les données.
 *
 * @param {Object} stationnement
 * @returns {{latitude: number, longitude: number}|null}
 */
export function getCoordinates(stationnement) {
    const latitude = Number(stationnement?.geo_point_2d?.lat);
    const longitude = Number(stationnement?.geo_point_2d?.lon);

    // Vérification de la validité des coordonnées.
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
