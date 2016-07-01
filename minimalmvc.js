(function(window){

				var Functions = function(){};
				Functions.getParameterNames = function(method) {
					var methodAsString = method.toString()
						.replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '');
					var parameterNames = methodAsString
						.slice(methodAsString.indexOf('(') + 1, methodAsString.indexOf(')'))
						.match(/([^\s,]+)/g);
					return parameterNames === null ? [] : parameterNames;
				};

				var URLs = function(){};
				URLs.getParametersByName = function(url) {
					var parts = url.split('?');
					if (parts.length < 2) {
						return {};
					}
					var query = {};
					parts[1].replace(/([^?=&]+)(=([^&]*))?/g, function(a, b, c, d) { query[b] = decodeURIComponent(d); });
					return query;
				};
				URLs.getPath = function(url) {
					// TODO passing scheme://domain portion will break this funciton
					var parts = url.split('?');
					return url.length > 1 && parts[0].endsWith('/')
						? parts[0].slice(0, -1) : parts[0];
				};
				URLs.template = function(template, variables) {
					return template.replace(/(:\w+)/g, function(a, b){
						var variable = b.substring(1);
						return encodeURIComponent(variables[variable]) || variable;
					});
				};

				window.Context = function(dependenciesByName) {

					var self = this;

					var getDependencyByName = function(name, scopedContext) {
						var dependency = scopedContext[name]
							|| dependenciesByName[name];
						if (typeof dependency === 'undefined') {
							throw new Error('Dependency "' + name + '" is not in the context or path.');
						}
						return dependency;
					};

					var getDependencies = function(method, scope) {
						return Functions.getParameterNames(method).map(function(name, index, names) {
							return getDependencyByName(name, scope);
						});
					};

					self.invokeWithDependencies = function(thisObject, method, scopedContext) {
						return method.apply(thisObject, getDependencies(method, scopedContext || {}));
					};
				};

				var Route = function(path, controller) {

					var self = this;
					self.path = path;
					self.controller = controller;

					var variables = [];
					var pattern = new RegExp('^' + self.path.replace(/(:\w+)/g, function(a, b){
						variables.push(b.substring(1));
						return '\(.*\)';
					}) + '$');

					self.matches = function(hash) {
						return pattern.test(hash);
					};

					self.getPathVariablesByName = function(hash) {
						var pathVariablesByName = {};
						hash.replace(pattern, function(){
							for (var i = 0; i < variables.length; i++) {
								pathVariablesByName[variables[i]] = arguments[i + 1];
							}
						});
						return pathVariablesByName;
					};
				};

				window.Router = function(options) {

					var self = this,
						routes = [],
						context = options.context,
						routeComparator = function(a, b) {
							var partsA = a.path.split('/');
							var partsB = b.path.split('/');
							var length = partsA.length < partsB.length ? partsA.length : partsB.length;
							for (var i = 0; i < length; i++) {
								var partA = partsA[i];
								var partB = partsB[i];
								if (partA == partB) {
									continue;
								}
								if (partA.startsWith(':')) {
									return 1;
								} else if (partB.startsWith(':')) {
									return -1;
								}
							}
							if (partsA.length != partsB.length) {
								return partsA.length < partsB.length ? 1 : -1;
							}
							return a.path.length < b.path.length ? 1 : -1;
						};

					self.replace = function(hash) {
						window.location.replace(window.location.href.split('#')[0] + '#' + hash);
					};

					self.push = function(hash) {
						window.location.href = window.location.href.split('#')[0] + '#' + hash;
					};

					var getHash = function() {
						var hash = window.location.hash.substring(1);
						if (hash == '') {
							return '/';
						}
						return  hash.startsWith('/') ? hash : '/' + hash;
					};

					/*
						Better route matching would make sure path leads with /
						and also expects the end
						matcher: /a should not match /aa for instance
					 */
					var getRoute = function(hash) {
						for (var i = 0; i < routes.length; i++) {
							var route = routes[i];
							if (route.matches(hash)) {
								return route;
							}
						}
						return null;
					};

					var route = function() {
						var hash = getHash();
						var path = URLs.getPath(hash);
						var route = getRoute(path);
						if (route == null) {
							throw new Error('No route matches ' + path);
						}
						context.invokeWithDependencies({}, route.controller, {
							request: {
								uri: hash,
								path: path,
								pathVariables: route.getPathVariablesByName(path),
								parameters: URLs.getParametersByName(hash),
								attributes: {},
								router: self,
								context: context,
								createURL: URLs.template
							}
						});
					};

					var postConstruct = function() {

						// initialize routes ( big todo )
						for (var path in options.routes) {
							routes.push(new Route(path, options.routes[path]));
						}
						routes.sort(routeComparator);

						window.addEventListener('hashchange', function(){ route(); });
						window.addEventListener('load', function(){ route(); });

						routes.map(function(route, index){
							console.debug('Routing [', route.path, '] to [', route.controller.name, ']');
						});
					};

					postConstruct();
				};
			})(window);
