/* =====================================================
   TESTS DE LA FONCTION filtrerParQuartier()
===================================================== */

describe("filtrerParQuartier()", () => {
    it("doit convertir un quartier en minuscules", () => {
        const resultat = filtrerParQuartier("CENTRE VILLE");
        expect(resultat).toBe("centre ville");
    });

    it("doit supprimer les accents d'un quartier", () => {
        const resultat = filtrerParQuartier("Île de Nantes");
        expect(resultat).toBe("Ile de Nantes");
    });

    it("doit supprimer les espaces au début et à la fin", () => {
        const resultat = filtrerParQuartier("  Centre Ville  ");
        expect(resultat).toBe("Centre Ville");
    });
});


/* =====================================================
   TESTS DE LA FONCTION filtrerNbPlaces()
===================================================== */

describe("filtrerNbPlaces()", () => {
    const stationnements = [
        { quartier: "Centre Ville", nombre_place: 12 },
        { quartier: "Île de Nantes", nombre_place: 25 },
        { quartier: "Hauts Pavés Saint Félix", nombre_place: 120 },
        { quartier: "Centre Ville", nombre_place: 8 }
    ];

    it("doit retourner tous les stationnements si la recherche est vide", () => {
        const resultat = filtrerNbPlaces(stationnements, "");
        expect(resultat).toHaveLength(4);
    });

    it("doit retourner les stationnements correspondant au nombre recherché", () => {
        const resultat = filtrerNbPlaces(stationnements, "25");
        expect(resultat).toHaveLength(1);
        expect(resultat[0].nombre_place).toBe(25);
    });


    it("doit accepter une recherche partielle", () => {
        const resultat = filtrerNbPlaces(stationnements, "12");
        expect(resultat).toHaveLength(2);
        expect(resultat.map(stationnement => stationnement.nombre_place))
            .toEqual([12, 120]);
    });

    it("doit retourner un tableau vide si aucun résultat ne correspond", () => {
        const resultat = filtrerNbPlaces(stationnements, "7");
        expect(resultat).toEqual([]);
    });
});


/* =====================================================
   TESTS DE LA FONCTION formaterDonnees()
===================================================== */

describe("formaterDonnees()", () => {
    it("doit créer un élément HTML de type article", () => {
        const stationnement = {
            commune: "Nantes",
            quartier: "Centre Ville",
            nombre_place: 12
        };
        const carte = formaterDonnees(stationnement);
        expect(carte.tagName).toBe("ARTICLE");
    });

    it("doit afficher la commune dans le titre de la carte", () => {
        const stationnement = {
            commune: "Nantes",
            quartier: "Centre Ville",
            nombre_place: 12
        };
        const carte = formaterDonnees(stationnement);
        expect(carte.querySelector("h3").textContent).toBe("Nantes");
    });

    it("doit afficher le quartier et le nombre de places", () => {
        const stationnement = {
            commune: "Nantes",
            quartier: "Ile de Nantes",
            nombre_place: 4
        };
        const carte = formaterDonnees(stationnement);
        expect(carte.querySelector(".quartier").textContent)
            .toBe("Ile de Nantes");
        expect(carte.querySelector(".nbPlaces").textContent)
            .toBe("4 places");
    });
});
