import { filtrerParQuartier, filtrerNbPlaces } from "./utils.js";


/* =====================================================
   1. TESTS DE filtrerParQuartier()
===================================================== */

describe("filtrerParQuartier()", () => {
    it("supprime les accents", () => {
        expect(filtrerParQuartier("Île de Nantes")).toBe("ile de nantes");
    });
    it("convertit le texte en minuscules", () => {
        expect(filtrerParQuartier("CENTRE VILLE")).toBe("centre ville");
    });
    it("supprime les espaces au début et à la fin", () => {
        expect(filtrerParQuartier("  Nantes  ")).toBe("nantes");
    });
    it("retourne une chaîne vide si la valeur est null", () => {
        expect(filtrerParQuartier(null)).toBe("");
    });
});


/* =====================================================
   2. TESTS DE filtrerNbPlaces()
===================================================== */

describe("filtrerNbPlaces()", () => {
    const stationnements = [{ nombre_place: 2 }, { nombre_place: 36 }, { nombre_place: 20 }, { nombre_place: 8 }];
    it("retourne tous les résultats si aucune recherche n'est saisie", () => {
        expect(filtrerNbPlaces(stationnements, "")).toEqual(stationnements);
    });
    it("filtre les résultats selon le nombre de places", () => {
        expect(filtrerNbPlaces(stationnements, "36")).toEqual([{ nombre_place: 36 }]);
    });
    it("accepte une correspondance partielle", () => {
        expect(filtrerNbPlaces(stationnements, "2")).toEqual([{ nombre_place: 2 }, { nombre_place: 20 }]);
    });
    it("retourne un tableau vide si aucun résultat ne correspond", () => {
        expect(filtrerNbPlaces(stationnements, "7")).toEqual([]);
    });
});