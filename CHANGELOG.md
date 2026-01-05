# Changelog grist-dsfr-react-app (framework)

## Unreleased
- Ajout du registre de composants partagés (type=component) chargé au démarrage et injecté dans les pages (accessible via `gristAPI.getComponent` et `gristUI`).
- Injection automatique de `helpers` dans les pages (via `gristUI.helpers` ou `gristAPI.helpers`), utilisé notamment par `home`.
- Header/Footer dynamiques hydratés depuis `Application_Header`, `Application_Footer`, `Application_Liens` (sans filtrage par env) avec fallback par défaut.
- Marquage du HTML (`widget-app.html`) pour l’injection dynamique du header/footer.
- Filtrage de la navbar par rôle/espace actif + états d’auth (show/hide) et prise en charge du `default_component` côté connecté.
- Gestion d’un espace actif (persisté en `localStorage`) et menu compte permettant de basculer d’espace.
- Normalisation des rôles (minuscule + suppression du token `L`) pour le filtrage `nav_roles`.
