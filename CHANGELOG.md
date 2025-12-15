# Changelog grist-dsfr-react-app (framework)

## Unreleased
- Ajout du registre de composants partagés (type=component) chargé au démarrage et injecté dans les pages (accessible via `gristAPI.getComponent` et `gristUI`).
- Injection automatique de `helpers` dans les pages (via `gristUI.helpers` ou `gristAPI.helpers`), utilisé notamment par `home`.
- Header/Footer dynamiques hydratés depuis `Application_Header`, `Application_Footer`, `Application_Liens` (sans filtrage par env) avec fallback par défaut.
- Marquage du HTML (`widget-app.html`) pour l’injection dynamique du header/footer.
