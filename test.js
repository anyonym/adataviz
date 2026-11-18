const promiseData = fetch("https://data.nantesmetropole.fr/api/explore/v2.1/catalog/datasets/244400404_stationnement-deux-roues-motorises-ville-nantes/records?where=%22Centre%20Ville%22%20OR%20%22Hauts%22%20OR%20%22Ile%22&limit=100")

// Récupérer les données de l'API et les parse pour les transformer en objet js exploitable
promiseData
.then((reponse) => {
    console.log(reponse.status)
    console.log(reponse.ok)
    reponse.json().then((donnees) => {
        console.log(donnees)
    })
    .finally(() => {
        console.log("END JSON")
    })
})
.catch((err) => {
    console.log("ERROR :" + err.message)
})
.finally(() => {
    console.log("END fetch")
})


