# Variables
PYTHON_VENV = ./tools/venv_xtts/bin/python3
PORTRAITS_SCRIPT = tools/generate_portraits.py
VOICES_SCRIPT = tools/generate_voices_xtts.py
NARRATIVE_WORKFLOW_SCRIPT = tools/narrative_workflow.py

.PHONY: help portrait portraits voices clean-voices plot-init plot-answer-major plot-answer-pov plot-answer-pov-set plot-pov-qa-start plot-answer-pov-qa plot-answer-pov-b plot-answer-pov-c plot-prompt build build-all build-mac build-win build-linux

help:
	@echo "Available commands:"
	@echo "  make portrait NAME=<name>   - Re-generate a single portrait (e.g., make portrait NAME=liu-bei)"
	@echo "  make portraits              - Re-generate ALL portraits"
	@echo "  make voices                 - Generate all voice lines"
	@echo "  make clean-voices           - Delete all generated voices"
	@echo "  make plot-init CHAPTER=<n>  - Initialize narrative workflow for chapter n"
	@echo "  make plot-answer-major CHARS=\"A, B\" - Save major characters answer for Question 1"
	@echo "  make plot-answer-pov        - Auto-answer Question 2 from selectable POV routes"
	@echo "  make plot-answer-pov-set CHARS=\"A, B\" NOTES=\"...\" - Save Question 3 POV set"
	@echo "  make plot-pov-qa-start      - Start POV A->B->C flow"
	@echo "  make plot-answer-pov-qa CHAR=\"Name\" ANSWER=\"1) [type] ... (1-3 sentences) | 2) ...\""
	@echo "  make plot-answer-pov-b TITLE_EN=\"...\" TITLE_ZH=\"...\" - Save Question B (story title)"
	@echo "  make plot-answer-pov-c TEASER_EN=\"...\" TEASER_ZH=\"...\" - Save Question C (early-story teaser, max 150 chars each)"
	@echo "  make plot-prompt            - Rebuild prompt from workflow state"
	@echo "  make build                  - Build Mac app bundle"
	@echo "  make build-all              - Build all platform releases (Mac, Windows, Linux)"
	@echo "  make build-mac              - Build Mac app bundle"
	@echo "  make build-win              - Build Windows portable"
	@echo "  make build-linux             - Build Linux AppImage"

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

# Narrative workflow
plot-init:
	@if [ -z "$(CHAPTER)" ]; then \
		echo "Error: Please specify CHAPTER, e.g., make plot-init CHAPTER=1"; \
		exit 1; \
	fi
	$(PYTHON_VENV) $(NARRATIVE_WORKFLOW_SCRIPT) init --chapter "$(CHAPTER)"

plot-answer-major:
	@if [ -z "$(CHARS)" ]; then \
		echo "Error: Please specify CHARS, e.g., make plot-answer-major CHARS=\"Liu Bei, Guan Yu\""; \
		exit 1; \
	fi
	$(PYTHON_VENV) $(NARRATIVE_WORKFLOW_SCRIPT) answer-major --chars "$(CHARS)"

plot-answer-pov:
	$(PYTHON_VENV) $(NARRATIVE_WORKFLOW_SCRIPT) answer-pov

plot-answer-pov-set:
	@if [ -z "$(CHARS)" ]; then \
		echo "Error: Please specify CHARS, e.g., make plot-answer-pov-set CHARS=\"Liu Bei, He Jin\" NOTES=\"...\""; \
		exit 1; \
	fi
	$(PYTHON_VENV) $(NARRATIVE_WORKFLOW_SCRIPT) answer-pov-set --chars "$(CHARS)" --notes "$(NOTES)"

plot-pov-qa-start:
	$(PYTHON_VENV) $(NARRATIVE_WORKFLOW_SCRIPT) start-pov-qa

plot-answer-pov-qa:
	@if [ -z "$(CHAR)" ]; then \
		echo "Error: Please specify CHAR, e.g., make plot-answer-pov-qa CHAR=\"Liu Bei\" ANSWER=\"...\""; \
		exit 1; \
	fi
	@if [ -z "$(ANSWER)" ]; then \
		echo "Error: Please specify ANSWER, e.g., make plot-answer-pov-qa CHAR=\"Liu Bei\" ANSWER=\"1) [battle] ...\""; \
		exit 1; \
	fi
	$(PYTHON_VENV) $(NARRATIVE_WORKFLOW_SCRIPT) answer-pov-qa --char "$(CHAR)" --answer "$(ANSWER)"

plot-answer-pov-b:
	@if [ -z "$(TITLE_EN)" ]; then \
		echo "Error: Please specify TITLE_EN, e.g., make plot-answer-pov-b TITLE_EN=\"The Oath in the Peach Garden\" TITLE_ZH=\"桃园结义\""; \
		exit 1; \
	fi
	@if [ -z "$(TITLE_ZH)" ]; then \
		echo "Error: Please specify TITLE_ZH, e.g., make plot-answer-pov-b TITLE_EN=\"The Oath in the Peach Garden\" TITLE_ZH=\"桃园结义\""; \
		exit 1; \
	fi
	$(PYTHON_VENV) $(NARRATIVE_WORKFLOW_SCRIPT) answer-pov-b --title-en "$(TITLE_EN)" --title-zh "$(TITLE_ZH)"

plot-answer-pov-c:
	@if [ -z "$(TEASER_EN)" ]; then \
		echo "Error: Please specify TEASER_EN, e.g., make plot-answer-pov-c TEASER_EN=\"In the capital, ...\" TEASER_ZH=\"京城之中，……\""; \
		exit 1; \
	fi
	@if [ -z "$(TEASER_ZH)" ]; then \
		echo "Error: Please specify TEASER_ZH, e.g., make plot-answer-pov-c TEASER_EN=\"In the capital, ...\" TEASER_ZH=\"京城之中，……\""; \
		exit 1; \
	fi
	$(PYTHON_VENV) $(NARRATIVE_WORKFLOW_SCRIPT) answer-pov-c --teaser-en "$(TEASER_EN)" --teaser-zh "$(TEASER_ZH)"

plot-prompt:
	$(PYTHON_VENV) $(NARRATIVE_WORKFLOW_SCRIPT) prompt

# Builds
build: build-mac

build-all:
	npm run dist:all

build-mac:
	npm run dist

build-win:
	npm run dist:win

build-linux:
	npm run dist:linux



