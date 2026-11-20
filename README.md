# README : Adataviz

Adataviz est une application web qui récupère un jeu de données réel depuis une API publique et l'affiche sous forme de cartes.
Les données exploitées sont les zones de stationnement dédiées aux motos et 2 roues motorisés, situées dans l'hypercentre de Nantes.
Des filtres sont applicables par quartiers, et une recherche est possible avec pour critère le nombre de place.
Une mini carte permet de localiser visuellement la zone, l'adresse géographique et les coordonnées GPS sont également présentées.

## Installation et utilisation 

1. Cloner le contenu du dépôt github : https://github.com/anyonym/adataviz.git
2. Depuis VS code : activer un serveur virtuel
3. La page d'accueil de l'application s'affiche dans une nouvelle fenêtre de votre navigateur
4. Les filtres par quartier de Nantes s'appliquent avec les 3 boutons de navigation situés en haut de page
5. Une barre de recherche par nombre de places est disponible juste dessous
6. des boutons de pagination aparaissent en bas d'écran selon le nombre de résultats affichés (12 maximum par page)
7. Navigation au clavier possible (accessibilité)

## Cartographie et données géographiques

Les coordonnées GPS ont été croisées avec OpenStreetMap, afin d'intégrer les mini-cartes avec une localisation exacte et de retourner l'adresse géographique pour chaque zone de stationnement.

## Pistes d'amélioration

- retour à tous les résultats sans avoir à rafraîchir la page (tri par quartiers)
- le bouton de fitre actif reste visuellement orange
- une fonction de recherche par adresse geographique
- skip de carte en carte sur la page de résultats sans passer par les liens OpenStreetMap