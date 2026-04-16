- De facut CRUD + forms pentru packagings - momentan se gestioneaza manual din DB

Custodie la furnizor

- Nota de transfer intre gestiuni
- Nota de Retur (de la facturile storno create de GNS)
- Nota de Retur (o redenumesc - pentru produsele stornate la furnizori)

# ArchivedBatch

- bug QuantityOriginal - este gresit - adauga ultima cantitate (cea care a mai ramas din tot lotul) atunci cand se termina. Ex. lot 100 buc, comandat 20,30,40, ramas 10, cand se va scade ult 10 buc, doar acel 10 se va adauga in arhiva.
- nu are un scurt history pentru trasabilitate rapida

# Foarte important

- la receptie - confirmare form, nu mai tine minte unde erai inainte, se reseteaza cautarile
- comanda, la creare si la modificare, se converteste doar pretul, nu si cantitatea
- de scos compensarile din lista plati, de scos platile anulate din totalul calculat, de adaugat posibilitatea de a sterge o plata anulata
- fisa client - LM FINANCIAL CONTA SERVICES S.R.L. bug sume 0
- solduri
- scoate restrictie cont creare furnizori / clienti ca sa accepte si banca straina + de adaugat trezorerii + TBI bank
- de adaugat posibilitatea scoaterii unui produs / a modifica o factura confirmata, evident trebuie sa se poata scoate si din aviz / livrare / comanda
- paletii storno
- Printare multiplă facturi iesire

# IMPORTANT

- de creat bon consum - documentul
- de adaugat coloane - produs - marje - pret- comanda

Ar trebui așa.

1. Livrare directă - atunci când pleacă direct de la furnizor și descarcă la client, apoi
2. tir complet (aici pleacă de la noi din curte , însă a fost descărcat , încărcat din nou în altă mașină și livrat, implică costuri logistice, de manipulare/depozitare)
3. ⁠Macara mare (mai avem și macara mică, dar o punem tot aici)
4. ⁠Mașini mici (dube - poate rămâne livrare mică)
5. ⁠Pf (persoane fizice)
6. Retail (aici este link pentru revânzători)

Urgent

- comanda - de blocat sa nu mai modifice tipul de livrare (pt ca se poate modifica si pretul sub minim, de oprit cumva) sub minim
- sold cuiul sa, sa fac cumva sa pot adauga plati negative? adica mi-au returnat cumva banii furnizorii (aveam sold negativ, mi-au dat banii inapoi, iar acum soldul e pe 0)
- notificari pentru executori - sa le faca automat din solduri
- in fisa de client - de facut total plati - total incasari jos la totaluri