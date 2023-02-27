Les tests couvrent à peu près tous les cas d'utilisations. Surtout les
event et les require. Il est vérifié que les tables contiennent bien les éléments
qui y ont été ajouté.

J'ai split en plusieurs describe en fonction de du WorkflowStatus, je trouvais 
ça plus logique et j'ai ensuite décomposé les test. A la fin j'ai ajouté un 
describe pour tester les changement de status de closing car ceux-ci ne nécessitaient 
qu'un seul test pour vérifier le lancement de l'event.

Je n'ai testé qu'une seule fois (au début) les require des fonctions changeant le
WorkflowStatus car on peut déduire que si elles fonctionne pour un état donné elles 
fonctionneront également pour les autre