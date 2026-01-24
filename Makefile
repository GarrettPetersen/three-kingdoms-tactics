# Variables
PYTHON_VENV = ./tools/venv_xtts/bin/python3
PORTRAITS_SCRIPT = tools/generate_portraits.py
VOICES_SCRIPT = tools/generate_voices_xtts.py

.PHONY: help portraits voices clean-voices

help:
	@echo "Available commands:"
	@echo "  make portrait NAME=<name>   - Re-generate a single portrait (e.g., make portrait NAME=liu-bei)"
	@echo "  make portraits              - Re-generate ALL portraits"
	@echo "  make voices                 - Generate all voice lines"
	@echo "  make clean-voices           - Delete all generated voices"

# Portraits
portrait:
	@if [ -z "$(NAME)" ]; then \
		echo "Error: Please specify a character name, e.g., make portrait NAME=liu-bei"; \
		exit 1; \
	fi
	$(PYTHON_VENV) $(PORTRAITS_SCRIPT) $(NAME)

portraits:
	$(PYTHON_VENV) $(PORTRAITS_SCRIPT)

# Voices
voices:
	$(PYTHON_VENV) $(VOICES_SCRIPT)

clean-voices:
	rm -f assets/audio/voices/*.ogg


