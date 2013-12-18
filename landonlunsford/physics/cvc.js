/*
sources:
http://www.randygaul.net/category/2d/
http://www.gamedev.net/topic/488102-circlecircle-collision-response/
http://processing.org/learning/topics/circlecollision.html
http://stackoverflow.com/questions/1736734/circle-circle-collision
http://sidvind.com/wiki/2D-Collision_response
http://www.euclideanspace.com/physics/dynamics/collision/twod/index.htm
http://www.amazon.com/dp/1435457331/?tag=stackoverfl08-20
optimized (w/o rotation):
http://www.gamasutra.com/view/feature/131424/pool_hall_lessons_fast_accurate_.php?print=1

double d = Math.sqrt(Math.pow(cx1 - cx2, 2) + Math.pow(cy1 - cy2, 2));
double nx = (cx2 - cx1) / d;
double ny = (cy2 - cy1) / d;
double p = 2 * (circle1.vx * nx + circle1.vy * n_y - circle2.vx * nx - circle2.vy * n_y) / (circle1.mass + circle2.mass);
vx1 = circle1.vx - p * circle1.mass * n_x;
vy1 = circle1.vy - p * circle1.mass * n_y;
vx2 = circle2.vx + p * circle2.mass * n_x;
vy2 = circle2.vy + p * circle2.mass * n_y;
*/
(function($, window){

	window.os = {
		geometry:{}
		,physics:{}
	};

	os.geometry.Circle = function(options){
		
		var radius = options.radius || 1
			,mass = options.mass || 0
			,inverseMass = mass == 0 ? 0 : 1 / mass
			,I = mass / (radius * radius * 0.5)
			,inverseI = 1 / I
		
		return $.extend(this,{
			x:0
			,y:0
			,angle:0
			,radius:radius
			,mass:mass
			,inverseMass:inverseMass
			,I:I
			,inverseI:inverseI
			,friction:.99
			,elasticity:.87
			,linearVelocityX:0
			,linearVelocityY:0
			,angularVelocity:0
			,linearDamping:1
			,angularDamping:1
		}, options);
	};
	
	os.physics.resolveLinearCollision = function(collision){
		/* without rotation */
		var body1 = collision.body1;
		var body2 = collision.body2;
		var contact = collision.contact;
		
		var totalInverseMassInversed = 1 / (body1.inverseMass + body2.inverseMass);
		var t = contact.depth * totalInverseMassInversed;
		var separationX = contact.normalX * t;
		var separationY = contact.normalY * t;
		
		body1.x -= separationX * body1.inverseMass;
		body1.y -= separationY * body1.inverseMass;
		body2.x += separationX * body2.inverseMass;
		body2.y += separationY * body2.inverseMass;
		
		var relativeVelocityX = body2.linearVelocityX - body1.linearVelocityX
		var relativeVelocityY = body2.linearVelocityY - body1.linearVelocityY
		
		var dp = relativeVelocityX * contact.normalX + relativeVelocityY * contact.normalY;
		
		if (dp > 0) return;
		
		var restitution = Math.min(body1.elasticity, body2.elasticity)
		
		var J = -(1 + restitution) * dp
		J /= 1 / body1.mass + 1 / body2.mass
		body1.linearVelocityX -= 1 / body1.mass * contact.normalX * J
		body1.linearVelocityY -= 1 / body1.mass * contact.normalY * J
		body2.linearVelocityX += 1 / body2.mass * contact.normalX * J
		body2.linearVelocityY += 1 / body2.mass * contact.normalY * J
	};
	
	os.physics.resolveLinearAndAngularCollision = function(collision){
	
		var body1 = collision.body1;
		var body2 = collision.body2;
		var contact = collision.contact;
	
		var totalInverseMassInversed = 1 / (body1.inverseMass + body2.inverseMass);
		var t = contact.depth * totalInverseMassInversed;
		var separationX = contact.normalX * t;
		var separationY = contact.normalY * t;
	
	
		var contactNormalX1 = body1.y - contact.y;
		var contactNormalY1 = contact.x - body1.x;
		var contactNormalX2 = body2.y - contact.y;
		var contactNormalY2 = contact.x - body2.x;
		
		body1.x -= separationX * body1.inverseMass;
		body1.y -= separationY * body1.inverseMass;
		body2.x += separationX * body2.inverseMass;
		body2.y += separationY * body2.inverseMass;
		
		var relativeVelocityX = (contactNormalX2 * body2.angularVelocity + body2.linearVelocityX)
			- (contactNormalX1 * body1.angularVelocity + body1.linearVelocityX);
		var relativeVelocityY = (contactNormalY2 * body2.angularVelocity + body2.linearVelocityY)
			- (contactNormalY1 * body1.angularVelocity + body1.linearVelocityY);
		
		var dp = relativeVelocityX * contact.normalX + relativeVelocityY * contact.normalY;
		
		if (dp > 0) return;
		
		var totalInverseMass = body1.inverseMass + body2.inverseMass;
		
		var tangentX = -contact.normalY;
		var tangentY = contact.normalX;
		
		var contactPerpNormal1 = contactNormalX1 * contact.normalX + contactNormalY1 * contact.normalY;
		var contactPerpNormal2 = contactNormalX2 * contact.normalX + contactNormalY2 * contact.normalY;
		var contactPerpTangent1 = contactNormalX1 * tangentX + contactNormalY1 * tangentY;
		var contactPerpTangent2 = contactNormalX2 * tangentX + contactNormalY2 * tangentY;
		
		var impulseDenominator1 = (contact.normalX * contact.normalX + contact.normalY * contact.normalY) * totalInverseMass
			+ contactPerpNormal1 * contactPerpNormal1 * body1.inverseI
			+ contactPerpNormal2 * contactPerpNormal2 * body2.inverseI;
		var impulseDenominator2 = (tangentX * tangentX + tangentY * tangentY) * totalInverseMass
			+ contactPerpTangent1 * contactPerpTangent1 * body1.inverseI
			+ contactPerpTangent2 * contactPerpTangent2 * body2.inverseI;
			
		//var restitution = (body1.elasticity + body2.elasticity) * 0.5;
		var restitution = Math.min(body1.elasticity, body2.elasticity)
		var friction = (body1.friction + body2.friction) * 0.5;

		// getting huge value for impulse1 "j"
		var impulse1 = -(1 + restitution) * dp / impulseDenominator1;
		var impulse2 = friction * -(relativeVelocityX * tangentX + relativeVelocityY * tangentY) / impulseDenominator2;

		var a = impulse1 * body1.inverseMass;
		var b = -impulse1 * body2.inverseMass;
		var c = impulse2 * body1.inverseMass;
		var d = -impulse2 * body2.inverseMass;
		
		body2.linearVelocityX += contact.normalX * a + tangentX * c;
		body2.linearVelocityY += contact.normalY * a + tangentY * c;
		body2.angularVelocity -= contactPerpNormal1 * impulse1 * body1.inverseI
			+ contactPerpTangent1 * impulse2 * body1.inverseI;
			
		body1.linearVelocityX += contact.normalX * b + tangentX * d;
		body1.linearVelocityY += contact.normalY * b + tangentY * d;
		body1.angularVelocity -= contactPerpNormal2 * -impulse1 * body2.inverseI
			+ contactPerpTangent2 * -impulse2 * body2.inverseI;
	};
	
	os.physics.Simulator = function(simulatables, timestep, canvas){
		this.simulatables = simulatables;
		this.timestep = timestep;
		
		//var lifecycle = [update, resolve, render];
		
		var collisionResolver = os.physics.resolveLinearCollision;
		
		
		this.step = function(){
			var s
				,lastIndex = simulatables.length - 1
				,twoPI = 2*Math.PI
				,s1
				,s2
				,i
				,j
				,dx
				,dy
				,squareDistance
				,totalRadii
				,distance
				,penetrationDepth
				,penetrationNormalX
				,penetrationNormalY
				,totalInverseMassInversed
				,t
				,separationX
				,separationY
				,relativeVelocityX
				,relativeVelocityY
				,impulse
				,context = canvas.getContext('2d');
		
			//update (Euler integration)
			for (i = lastIndex; i >= 0; i--){
				s = simulatables[i];
				s.x += (s.linearVelocityX *= s.linearDamping);
				s.y += (s.linearVelocityY *= s.linearDamping);
				s.angle += (s.angularVelocity *= s.angularDamping);
			}
			
			context.clearRect(0, 0, canvas.width, canvas.height);
			
			//resolve
			for (i = lastIndex; i >= 0; i--){
				for (j = 0; j < i; j++){
					s1 = simulatables[i]
					s2 = simulatables[j];
					dx = s2.x - s1.x;
					dy = s2.y - s1.y;
					squareDistance = dx * dx + dy * dy;
					totalRadii = s1.radius + s2.radius;
					if (squareDistance < totalRadii * totalRadii){
						distance = Math.sqrt(squareDistance);
						penetrationDepth = totalRadii - distance;
						penetrationNormalX = dx/distance;
						penetrationNormalY = dy/distance;
						
						var body1 = s1
						,body2 = s2
						,contact = {
							x: s1.x + penetrationNormalX * s1.radius
							,y: s1.y + penetrationNormalY * s1.radius
							,normalX: penetrationNormalX
							,normalY: penetrationNormalY
							,depth: penetrationDepth
						};
						
						context.beginPath();
						context.arc(contact.x,contact.y,4, 0, twoPI, false);
						context.fill();
						
						collisionResolver({
							body1: s1,
							body2: s2,
							contact: contact
						});
						
					}
				}
			}
			
			//render
			for (i = lastIndex; i >= 0; i--){
				s = simulatables[i];
				context.beginPath();
				context.arc(s.x, s.y, s.radius, 0, twoPI);
				context.stroke();
				context.beginPath();
				context.moveTo(s.x, s.y);
				context.lineTo(s.x + Math.cos(s.angle)*s.radius, s.y + Math.sin(s.angle)*s.radius);
				context.stroke();
			}
		};
		this.run = function(){
			this.interval = setInterval(this.step, this.timestep);
		};
		this.stop = function(){
			clearInterval(this.interval);
		};
		return this;
	};
})(jQuery, window);


