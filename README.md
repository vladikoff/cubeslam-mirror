Verlet Simulation
=================

A port to javascript from: http://gamedev.tutsplus.com/tutorials/implementation/simulate-fabric-and-ragdolls-with-simple-verlet-integration/


## TODO

* Use linked lists to avoid using Array#splice? Something is fishy with the GC
* Add a third dimension! 
* It would be great to test a WebGL renderer vs the Canvas one.
* Add friction on the paddles
* Refactor Rect -> Polygon and make the collision detection more generic