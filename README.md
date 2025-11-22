\***\*\*\*\*\*\*\***\*\*\*\*\***\*\*\*\*\*\*\*** Bugs **\*\***\*\*\*\***\*\***\***\*\***\*\*\*\***\*\***

- dupa crearea unui nou cont, apare notificare de eroare - de verificat

\***\*\*\*\*\*\*\***\*\*\*\*\***\*\*\*\*\*\*\*** FIX **\*\***\*\*\*\***\*\***\*\***\*\***\*\*\*\***\*\***

- Searchul de la clienti merge daor dupa nume - de adaugat cui, cnp

\***\*\*\*\*\*\*\***\*\*\*\*\***\*\*\*\*\*\*\*** TO DO **\*\***\*\***\*\***\*\*\*\***\*\***\*\***\*\***

- de modificat lista admin ca cealalta la actiuni Sus langa butonul de creaza adauga si btn de edit si de scanat produs
- in lista normala de adaugat nr produse la pachet.
- sa se poata bifa in lista undeva sa se afiseze pretul si pe bucata/ambalaj (cutie, punga etc)
- sa se poata afisa pretul si cu TVA (trebuie facut modulul de TVA aici)
- de facut modificare marja TVA + de oferit posibilitatea afisarii pretului cu TVA inclus
- la catalog + admin products - de adaugat posibilitatea afisarii pretului cu TVA
- de facut form edit product
- Modul plafoane clienti (sa includa limita pt fiecare client, sumele restante ale acestora, daca sunt sau nu blocati de la livrari)
- Modul autorizatii necesare livrare (sa includa zonele cu restrictii -numele de strazi, comune, orase, drumuri etc, taxele necesare de plata, alte mentiuni)
- Modul Proiecte (aici pot fi grupati 2-3-4 sau orice alt nr de clienti pe un proiect (adica o singura adresa unde se livreaza marfa), in cote egale sau diferite. structura trebuie asemnatoare ca la client, deoarece in comenzi/livrari se vor putea selecta clienti individuali, sau proiecte, care vor contine in ele 1-2-3 etc clienti individuali). facturile trb sa se poata genera pe comanda, fiecarui client, in functie de procentul pe care il are in acel proiect. precum si restul documentelor trebuiesc emise la fel.
- De facut CRUD + forms pentru packagings - momentan se gestioneaza manual din DB

- comenzile care se tin mai mult de 30 zile in curte se percepe taxa de custodie. % din pretul total/luna

-servicii

- taxa administrare paleti
- manipulare marfa - liza, macara etaj superior, multiple calari

Custodie la furnizor

- sa se poata inregistra fara aviz

Detalii facturare

- se adauga selector cost intre furnizor si transport

- ex cemacon. factura de transport se refactureaza catre cemacon, deci nu modifica pretul individual al produsului
- selecltor factura, populare automata rand cu date dn factura

\*\* Factura

- selector de facturi - din cele descarcate din efactura (receptii)

* Alte documente

Adauga Nr incarcare spv la facturi (dupa finalizarea modul efactura)

- Livrari\*

Comenzi - acum ca am finalizat fisa de client / client summary, trebuie sa adaug informatiile "live" in comanda in selectorul de client.

Livrari - in momentul de fata toate livrarile urmeaza acelasi flux, comenzile sunt finalizate, dupa se redirectioneaza la livrari, se selecteaza ce si cand se livreaza si se creaza livrarea. Trebuie separat fluxul pentru edge caseuri, respectiv, pentru comenzile pe care le ridica clientul, acesta trebuie programat, dar nu are nevoie sa se selecteze tipul de masina si nici sa se puna transport (tipul de maisna se alege la toate acum, la asta ar trebui sa apara ridicare client), iar pentru livrarile directe, care se fac masini straine, la fel, nu se mai selecteaza masina asa ca trebuie sa adaug un checkmark cu "livrare transportator tert" care daca e selectat nu se mai alege tipul masinii.

Acum, pe langa asta, dupa crearea livrarilor, toate livrarile sunt in lista de alocare, ceea ce e bine, dar, toate se aloca pe masinile noastre, livrarile unde se ridica produsul, si care se livreaza cu masini terte, trebuie alocate separat, nu in tabelul cu masinile proprii, trebuie adaugate coloane de "ridicare client" si "livrare terta", sau o singura coloana care sa fie pentru ambele.

- Nota de Retur (de la facturile storno create de GNS)
- Nota de Retur (o redenumesc - pentru produsele stornate la furnizori)
