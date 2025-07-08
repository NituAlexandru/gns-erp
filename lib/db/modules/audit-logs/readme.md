Poți seta un TTL (Time To Live) index pe câmpul timestamp al colecției tale de audit, astfel încât documentele să fie șterse automat după un anumit număr de secunde.

Dacă vrei 30 zile, folosești 30 _ 24 _ 3600 = 2_592_000

Pentru 60 zile, 5_184_000

Pentru 1 an, 31_536_000

⚠️ TTL index‐urile rulează aproximativ o dată pe minut, deci nu e o ștergere instantă, dar te scapă de orice cron job suplimentar.

2. Arhivare + Ștergere manuală
   Dacă vrei să păstrezi arhiva de loguri în fișiere locale (JSON/CSV) înainte de a le șterge din baza de date:

Script Node.js care rulează periodic (cron sau setInterval):

Recomandare
TTL index e cea mai simplă pentru un retention policy fix (ex. logurile mai vechi de un an nu mai sunt utile în aplicație).

Dacă ai nevoie să păstrezi logurile offline (pentru audit extern, conformitate), fă un script de arhivare înainte de ștergere.

În ambele cazuri, baza ta de date rămâne „sub control” și logurile nu se vor acumula la infinit.
