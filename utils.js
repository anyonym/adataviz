/* =====================================================
	 4. FONCTIONS UTILITAIRES
===================================================== */

const url = "https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_stationnement-deux-roues-motorises-ville-nantes/records?select=gid%2C%20commune%2C%20quartier%2C%20nombre_place%2C%20geo_point_2d&where=%22Centre%20Ville%22%20OR%20%22Ile%20de%20Nantes%22%20OR%20%22Hauts%20Pav%C3%A9s%20Saint%20F%C3%A9lix%22&limit=100"

// Récupérer les données de l'API et les parse pour les transformer en objet js exploitable
export async function chargerDonnees() {
	try {
		const reponse = await fetch(url)
		if (!reponse.ok) {
			throw new Error("Erreur HTTP " + reponse.status)
		}
		const donnees = await reponse.json()
		console.log(donnees.results)
		return donnees.results;
		console.log(donnees.total_count + " enregistrements au total")
	} catch (err) {
		console.error("Erreur de chargement :", err.status, err.message)
	}
}

/**
 * Normalise un texte pour faciliter les comparaisons.
 * Supprime les accents, les espaces superflus
 * et uniformise les caractères en minuscules.
 */
export function normalizeText(text) {

    return String(text ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

/**
 * Normalise le nom du quartier pour faciliter les 
 * comparaisons.
 */
export function filtrerParQuartier(text) {
    return normalizeText(text);
}

/**
 * Filtre les cartes de résultats selon le nombre de place par zone.
 * La recherche accepte une correspondance partielle.
 * Exemple : "12" correspond à 12, 120 ou 125 places.
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
	 9. CRÉATION D'UNE CARTE DE RÉSULTAT
===================================================== */

/**
 * Crée une carte simple destinée à la section .results.
 *
 * Elle contient :
 * - La commune
 * - Le quartier
 * - Le nombre de places
 * - Une mini-carte si possible
 */
export function formaterDonnees(stationnement, onSelect) {

		const article = document.createElement("article");
		article.classList.add("carte");

		// Commune
		const titre = document.createElement("h3");
		titre.textContent =
				stationnement.commune ?? "Commune inconnue";

		// Informations
		const listeInformations = document.createElement("ul");

		// Quartier
		const quartier = document.createElement("li");
		quartier.classList.add("quartier");
		quartier.textContent =
				stationnement.quartier ?? "Non renseigné";

		// Nombre de places
		const nbPlaces = document.createElement("li");
		nbPlaces.classList.add("nbPlaces");
		nbPlaces.textContent =
				`${stationnement.nombre_place} places`;

		listeInformations.append(quartier, nbPlaces);

		// // Mini-carte
		// const miniMap = createMiniMap(stationnement);

		// Assemblage
		article.append(
				titre,
				listeInformations,
				// miniMap
		);

		// Accessibilité : carte sélectionnable au clavier
		article.tabIndex = 0;
		article.setAttribute("role", "button");
		article.setAttribute("aria-label",
				`Voir le détail du stationnement ${stationnement.quartier ?? ""}`
		);

		// Ouverture de la fiche détaillée
		article.addEventListener("click", () => {
    		onSelect(stationnement);
		});

		article.addEventListener("keydown", event => {
    		if (event.key === "Enter" || event.key === " ") {
		        event.preventDefault();
        		onSelect(stationnement);
    		}
		});
		return article;
}