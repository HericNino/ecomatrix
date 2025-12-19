#!/bin/bash

# Test Shelly Plug S utičnica - provjera komunikacije

echo "======================================"
echo "  Testiranje Shelly Plug S utičnica  "
echo "======================================"
echo ""

# Boje za output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# IP adrese utičnica
LOW_IP="192.168.1.166"    # Niska potrošnja
MEDIUM_IP="192.168.1.71"   # Srednja potrošnja
HIGH_IP="192.168.1.244"    # Visoka potrošnja

# Funkcija za testiranje jedne utičnice
test_plug() {
    local ip=$1
    local name=$2

    echo -n "Testiram ${name} (${ip})... "

    # Pokušaj ping
    if ping -c 1 -W 2 $ip > /dev/null 2>&1; then
        echo -e "${GREEN}PING OK${NC}"

        # Pokušaj API poziv
        echo -n "  Testiram API... "
        response=$(curl -s --max-time 5 http://$ip/rpc/Shelly.GetStatus)

        if [ $? -eq 0 ] && [[ $response == *"pm1:0"* ]]; then
            echo -e "${GREEN}API OK${NC}"

            # Izvadi podatke o potrošnji
            power=$(echo $response | grep -o '"apower":[0-9.]*' | cut -d':' -f2)
            voltage=$(echo $response | grep -o '"voltage":[0-9.]*' | cut -d':' -f2)
            current=$(echo $response | grep -o '"current":[0-9.]*' | cut -d':' -f2)
            total=$(echo $response | grep -o '"total":[0-9.]*' | head -1 | cut -d':' -f2)

            echo "  ├─ Snaga: ${power} W"
            echo "  ├─ Napon: ${voltage} V"
            echo "  ├─ Struja: ${current} A"
            echo "  └─ Ukupno: ${total} Wh"
        else
            echo -e "${RED}API GREŠKA${NC}"
        fi
    else
        echo -e "${RED}PING NEUSPJEŠAN${NC}"
        echo "  └─ Uređaj nije dostupan na mreži"
    fi

    echo ""
}

# Testiraj sve utičnice
echo "1. UTIČNICA NISKE POTROŠNJE"
test_plug $LOW_IP "Niska potrošnja"

echo "2. UTIČNICA SREDNJE POTROŠNJE"
test_plug $MEDIUM_IP "Srednja potrošnja"

echo "3. UTIČNICA VISOKE POTROŠNJE"
test_plug $HIGH_IP "Visoka potrošnja"

echo "======================================"
echo "  Test završen!                      "
echo "======================================"
echo ""
echo "Ako su svi testovi prošli, možete nastaviti sa:"
echo "  - Kreiranjem uređaja u sustavu"
echo "  - Pridruživanjem utičnica uređajima"
echo "  - Prikupljanjem podataka"
echo ""
echo "Pogledajte TEST_SETUP.md za detaljne upute."
