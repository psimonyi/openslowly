## General
name = Ouvrir les marque-pages lentement
menu = Tout ouvrir lentement

## Status page
error-open = Désolé, OML ne peut pas ouvrir cet onglet. ({ $message })
error-load = Erreur lors du chargement de cette page. ({ $message })
error-tab-closed = Cet onglet a été fermé.
error-stopped = Le chargement de cette page a été arrêté.
heading-working = L’ouverture des onglets en cours
heading-done = Terminée
button-pause = Arrêter
button-resume = Reprendre
notification-title = Chargement des marque-pages terminée
notification-body = { name } a fini l’ouverture de ‘{ $folderName }’.

## Prefs
prefs-inflight-max = Nombre maximal de onglets en cours en même temps : 
prefs-notify = Signaler la terminaison du chargement
prefs-tip-intro = <b>Idée :</b>
    Si vous avez désactivé l’avertissement de Firefox sur l’ouverture des
    multiples onglets simultanément, vous peut-être désirez le réactiver.
prefs-tip-expand = Afficher plus ⏵
-fx-prefs =
    { PLATFORM() ->
        [win] les options
       *[other] les préférences
    }
prefs-tip-text = Ouvrir { -fx-prefs } de Firefox.  Dans la section Général,
    sous-section Onglets, activer « Prévenir lors de l’ouverture de multiples
    onglets d’un ralentissement possible de Firefox ».  Si l’option n’est pas
    disponsible, elle a été activé.  Lorsque l’avertissement s’affiche-t-il,
    c’est un rappel pour utiliser { name }.
