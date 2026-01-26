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

Livrari - bug la blocarile intervalelor, nu se blocheaza primele 2 intervale.

- Nota de Retur (de la facturile storno create de GNS)
- Nota de Retur (o redenumesc - pentru produsele stornate la furnizori)

* Receptii + Inventar (pe fiecare lot)

- De adaugat certificate - nr si data/ sarja / raport incercari/ la intrari si pe stoc

# Produse

- Unele produse au furnizori multiplii. La receptie e ok, se selecteaza furnizorul in receptie. La comanda .... trebuie ales? catalog produse trebuie afisate ambele... sau?

- verifica advanceScope

# Pag produs - generala

- de verificat btn de edit / sterge sa fie conditionate doar pt admin.
- de facut pagina de produs
- in pagina de produs sa afisez istoric preturi vanzare / + preturi cumparare pt admini

# ArchivedBatch

- bug QuantityOriginal - este gresit - adauga ultima cantitate (cea care a mai ramas din tot lotul) atunci cand se termina. Ex. lot 100 buc, comandat 20,30,40, ramas 10, cand se va scade ult 10 buc, doar acel 10 se va adauga in arhiva.
- nu are un scurt history pentru trasabilitate rapida

# dashboard - lista Stoc disponibil negativ (ca sa stie ca trebuie sa comande)

# De urmarit / testat

- FACUT - factura split, trebuie sa bata pe sumele totale conform cotelor, nu fiecare rand + adresa de livrare. factura split, bate pe sumele totale conform cotelor, nu fiecare rand.

# Foarte important

- solduri
- lista de facturi plati catre furnizori, facturile storno trebuie afisate cu minus. factura din 01.01.26
- scoate restrictie cont creare furnizori / clienti ca sa accepte si banca straina + de adaugat trezorerii + TBI bank
- de adaugat posibilitatea scoaterii unui produs / a modifica o factura confirmata, evident trebuie sa se poata scoate si din aviz / livrare / comanda
- aspect factura - de verificat la fact mai mari de o pagina
- paletii storno
- la facturi de la funizori, sa poata fi cautate dupa furnizori (incasari si plati)
- la produse in aplicatie, sa se afiseze cate buc sunt la palet
- La facturi, când modific ceva aș vrea să rămână la aceeași pagină - cu factura modificată
- LA PRODUSE, CAND CAUT UN PRODUS SA IMI RAMANA ACEL PRODUS , NU SA DISPARA CAND DAU BACK
- Printare multiplă facturi iesire
- eroare la anularea facturii
- NU MA LASA SA ADAUG LINIE CU MINUS, SI AM FACTURI CU DISCOUNT
- La facturile introduse manual in plăti furnizori ma obliga sa bag serie
