#!/bin/bash

# Путь к папке с конфигами
CONF_DIR=".repomix"

case $1 in
  be)
    echo "Updating Backend context..."
    npx repomix --config "$CONF_DIR/be.json"
    ;;
  fe)
    echo "Updating Frontend context..."
    npx repomix --config "$CONF_DIR/fe.json"
    ;;
  mira)
    echo "Updating Mira Catalog context..."
    npx repomix --config "$CONF_DIR/catalog.json"
    ;;
  all)
    echo "Updating ALL contexts..."
    npx repomix --config "$CONF_DIR/be.json"
    npx repomix --config "$CONF_DIR/fe.json"
    npx repomix --config "$CONF_DIR/catalog.json"
    ;;
  *)
    echo "Usage: ./update_ctx.sh {be|fe|mira|all}"
    ;;
esac

echo "Done! ✨"