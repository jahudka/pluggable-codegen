.PHONY: default
default: clean build

.PHONY: clean
clean:
	rm -rf dist

.PHONY: deps
deps: node_modules

node_modules:
	npm ci

.PHONY: lint
lint: deps
	node_modules/.bin/eslint .

.PHONY: style
style: deps
	node_modules/.bin/prettier --check .

.PHONY: types
types: deps
	node_modules/.bin/tsc

.PHONY: lint-fix
lint-fix: deps
	node_modules/.bin/eslint --fix .

.PHONY: style-fix
style-fix: deps
	node_modules/.bin/prettier --write .

.PHONY: pretty
pretty: lint-fix style-fix

.PHONY: checks
checks: lint style types

.PHONY: build
build: dist

dist: deps
	node_modules/.bin/tsup

.PHONY: publish
publish: dist
	npm view "$$( jq -r '.name + "@>=" + .version' package.json )" version >/dev/null 2>&1 || npm publish
