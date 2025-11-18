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
- de modificat btn de stergere la produse ca sa distinga intre paleti si produse

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

- selector de facturi - din cele descarcate din efactura,
- la facturi storno trebuie adaugat si serviciu
- bug la factura storno, cand dau sa adaug produs individual
- de creat factura discount
- utilizatorii normali vad butonul de incarca in efactura - nu ar trebui
- factura discount
* Alte documente

\*\* Adrese client/ furnizor

- de pus steluta la campurile obligatorii
- de scos obligatoriu de la strada
- de adaugat functia celui care receptioneaza marafa - la adrese
- conturile sa ie obtionale
- de facut obtionale campurile de persoana de contact si nr de telefon
  Nr incarcare spv la facturi

-de testat factura de avans in fisa client

- Livrari\*

Bug - editare comanda, nu vede ce mai e de adaugat

suma trezorerie - total faccturat = incasat + de incasat
