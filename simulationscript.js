
APP = {};
MAGNETIC_CONST = (4e-7) * Math.PI;
AU = 1000000.0; // how many pixels are one AU

/* updates the simulation state */
function update () {
    APP.time += 1.0/60.0;
    move_charges();
    render_charges();
    requestAnimationFrame(update);
}

/* updates the state of the solar wind particles */
function move_charges()
{
    for (var i = 0; i < APP.chargesInfo.length; i ++){
	if (APP.chargesInfo[i].life <= -1){
	    if (APP.chargesInfo[i].life == -1){
		APP.chargesInfo[i] = make_ion(APP.ionLife-2);
	    }else{
		APP.chargesInfo[i].life += 1;
		continue;
	    }
	}
	APP.chargesInfo[i].pos = APP.chargesInfo[i].pos.add(APP.chargesInfo[i].vel);
	APP.chargesInfo[i].vel = APP.chargesInfo[i].vel.add(lorentz_force_acceleration(i));
	APP.chargesInfo[i].life -= 1;
	
    }
}

/* positions all the charged particles according to their state and renders the scene */
function render_charges()
{
    for (var i = 0; i < APP.chargesInfo.length; i ++){
	if (APP.chargesInfo[i].life <= -1){
	    continue;
	}
	APP.chargesObjects[i].position.x = APP.chargesInfo[i].pos.e(1);
	APP.chargesObjects[i].position.y = APP.chargesInfo[i].pos.e(2);
	APP.chargesObjects[i].position.z = APP.chargesInfo[i].pos.e(3);
    }
    APP.renderer.render(APP.scene, APP.camera);
}

function randint(a, b)
{
    return Math.floor(Math.random()*(b-a) + a);
}

APP.period = 2;
APP.squareLength = 300;

function length(x, y)
{
    return Math.sqrt(x*x + y*y);
}

function magnetic_field_dipole(pos)
{
    var r = $V([APP.earthPosition, 0, 0]).subtract(pos);
    // tilting angle of the earth is 23.44 degrees
    // but magnetic pole is ~ 11 degrees less, so we have ~ 11 degrees or 0.192 radians

    // magnetic moment of the earth
    // source: https://physics.stackexchange.com/questions/187088/calculating-dipole-magnetic-moment-given-magnetic-field-strength
    var m_  = APP.momentFactor*6.48e10; // original e22
    var m = $V([m_*Math.sin(0.192), m_*Math.cos(0.192), 0]);
    
    var r_ = Math.sqrt(r.dot(r));
    var B = ((r.multiply(3 * (m.dot(r))/(r_**5.0))).subtract(m.multiply(1.0/(r_**3.0)))).multiply(MAGNETIC_CONST/(4*Math.PI));
    // $V([0, 0, -MAGNETIC_CONST * current/(2*Math.PI*(Math.sqrt(r1.dot(r1))))]);
    return B;
}

function lorentz_force_acceleration(charge_index)
{
    var B_ = magnetic_field_dipole(APP.chargesInfo[charge_index].pos);
    var q = APP.chargesInfo[charge_index].charge;
    var V_= APP.chargesInfo[charge_index].vel;
    var F = (V_.cross(B_)).multiply(q);
    return (F.multiply(1/APP.chargeMass));
}

/* creates a new wind particle and returns it */
function make_ion(life_)
{   
    APP.positionVariance = 20;
    var R = APP.aperatureRadius;
    var posy = 2*APP.aperatureRadius*(Math.random()-0.5);
    var posz = 2*APP.aperatureRadius*(Math.random()-0.5);

    var a = randint(-APP.deltaAngle, APP.deltaAngle)*Math.PI/180.;
    var y = Math.sin(a)*APP.velocities;
    var b = randint(-10, 10)*Math.PI/180.;
    var ob = {
	pos: $V([-600, posy, posz]),
	vel: $V([Math.cos(a)*APP.velocities, Math.cos(b)*y, Math.sin(b)*y]),
	life: life_,
	charge: APP.chargeAmount,
    };
    return ob;
}

function reset_parameters()
{
    APP.chargesInfo = [];
    APP.scene = null;
    APP.scene = new THREE.Scene();
    
    APP.scene.add(APP.camera);
    APP.scene.add(APP.pointLight);
    APP.scene.add(APP.ambientLight);

    
    APP.scene.add(APP.sunObject);
    APP.scene.add(APP.earthObject);
    
    APP.scene.add(APP.skyBox);
    
    for (var i = 0; i < APP.ionCount; i ++){
	APP.chargesObjects[i].position.z = -100000;
	APP.scene.add(APP.chargesObjects[i]);
	
	APP.chargesInfo.push(make_ion(-Math.floor((i/APP.ionCount)*APP.ionLife)));
    }
}

/* initializes some parameters and variables for the simulation */
function init()
{
    onchange_mass();
    onchange_count();
    onchange_angle();
    onchange_charge();
    onchange_velocities();
    onchange_life();
    onchange_aperature();
    onchange_moment();
        
    APP.time = 0;

    APP.viewWidth = 800;
    APP.viewHeight = 600;

    APP.renderer = new THREE.WebGLRenderer();
    APP.camera = new THREE.PerspectiveCamera(20, APP.viewWidth/APP.viewHeight, 0.1, 10000000);
    APP.camera.position.set(0,0,1500);
    APP.camera.lookAt(new THREE.Vector3(0,0,0));
    
    APP.renderer.setSize(APP.viewWidth, APP.viewHeight);
    
    $("#container").append(APP.renderer.domElement);

    APP.controls = new THREE.OrbitControls(APP.camera, APP.renderer.domElement);

    APP.ionTexture = THREE.ImageUtils.loadTexture('res/charge.png');
    APP.ionTexture.wrapS = THREE.RepeatWrapping;
    APP.ionTexture.wrapT = THREE.RepeatWrapping;
    
    APP.chargeMaterial = new THREE.MeshBasicMaterial({map: APP.ionTexture, /* color: 0xFF0000*/ side: THREE.DoubleSide});

    // skybox
    APP.skyTextureList = [
      THREE.ImageUtils.loadTexture("res/xpos.png"),
      THREE.ImageUtils.loadTexture("res/xneg.png"),
      THREE.ImageUtils.loadTexture("res/ypos.png"),
      THREE.ImageUtils.loadTexture("res/yneg.png"),
      THREE.ImageUtils.loadTexture("res/zpos.png"),
      THREE.ImageUtils.loadTexture("res/zneg.png")
    ];
    
    APP.skyMaterialArray = [];
    for (var i = 0; i < 6; i++)
	APP.skyMaterialArray.push( new THREE.MeshBasicMaterial({
	    map: APP.skyTextureList[i],
	    side: THREE.BackSide
    }));
    
    APP.skyGeometry = new THREE.CubeGeometry( AU*1.5, AU*1.5, AU*1.5 );
    APP.skyMaterial = new THREE.MeshFaceMaterial( APP.skyMaterialArray );
    APP.skyBox = new THREE.Mesh(APP.skyGeometry, APP.skyMaterial );
    APP.skyBox.rotation.x += Math.PI / 2;
    
    
    // "light source"
    APP.pointLight = new THREE.PointLight(0xAAAAAA);
    APP.ambientLight = new THREE.AmbientLight(0x777777);
    APP.pointLight.position.x = -10;
    APP.pointLight.position.y = 0;
    APP.pointLight.position.z = 0;

    APP.sunMaterial = new THREE.MeshLambertMaterial({color: 0xFFFF00});
    APP.sunSphere = new THREE.SphereGeometry(AU/215.0,10,10);
    
    APP.sunObject = new THREE.Mesh(APP.sunSphere, APP.sunMaterial);
    APP.sunObject.position.z = 0;
    APP.sunObject.position.x = -AU+100;
    APP.sunObject.position.y = 0;

    //APP.earthMaterial = new THREE.MeshLambertMaterial({color: 0x0000FF});
    APP.earthTexture = THREE.ImageUtils.loadTexture('res/earth.png');
    APP.earthMaterial = new THREE.MeshLambertMaterial({map: APP.earthTexture});
    
    APP.earthSphere = new THREE.SphereGeometry((AU/215.0)/109.0,10,10);
    APP.earthObject = new THREE.Mesh(APP.earthSphere, APP.earthMaterial);
    APP.earthObject.position.z = 0;
    // 1 AU away from the sun
    APP.earthPosition = 100.0;
    APP.earthObject.position.x = APP.earthPosition;
    APP.earthObject.position.y = 0;

    
    APP.geometryCount = 0;
    APP.chargesObjects = Array(5000);
    for (var i = 0; i < 5000; i ++){
	APP.chargesObjects[i] = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), APP.chargeMaterial);
    }
    
    reset_parameters();   
    
    APP.doneInit = true;
    requestAnimationFrame(update);
}


/* functions that handle input changes (when sliders are changed, they update the values in the simulation to set the new values) */

function relabel(id_name, new_value)
{
    $("#"+id_name).text(new_value);
}

function onchange_mass(t)
{
    t = t ? t.value : $("#mass").val();
    APP.chargeMass = parseFloat(t);
    relabel("massl", t);
}

function onchange_life(t)
{
    t = t ? t.value : $("#massflow").val();
    // there's an inverse relation between life of particle ins and flowrate
    APP.ionLife = Math.floor(10000*1000/parseFloat(t) / (APP.ionCount));
    relabel("massflowl", t);
    if (APP.doneInit == true)
	reset_parameters();
}

function onchange_count(t)
{
    t = t ? t.value : $("#ion_count").val();
    APP.ionCount = parseFloat(t);
    relabel("ion_countl", t);
    if (APP.doneInit == true)
	reset_parameters();
}

function onchange_angle(t)
{
    t = t ? t.value : $("#angle").val();
    console.log($("#anglel"));
    APP.deltaAngle = parseFloat(t);
    relabel("anglel", t);
}

function onchange_charge(t)
{
    t = t ? t.value : $("#charge").val();
    APP.chargeAmount = parseFloat(t);
    relabel("chargel", t);
}

function onchange_velocities(t)
{
    t = t ? t.value : $("#velocities").val();
    APP.velocities = parseFloat(t);
    relabel("velocitiesl", t);
}

function onchange_aperature(t)
{
    var oldradius = APP.aperatureRadius;
    t = t ? t.value : $("#aperature").val();
    APP.aperatureRadius = parseFloat(t);
    relabel("aperaturel", t);
}

function onchange_moment(t)
{
    t = t ? t.value : $("#moment").val();
    APP.momentFactor = parseFloat(t);
    relabel("momentl", t);
}
