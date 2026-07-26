/**
 * Model Registry
 *
 * This file ensures all Mongoose models are eagerly imported and registered
 * before any database operations are performed. This prevents the common
 * MissingSchemaError that occurs when .populate() references a model whose
 * schema hasn't been registered yet.
 *
 * Import this file once at application startup (e.g., in mongodb.ts).
 */

import "./Category";
import "./Item";
import "./User";
import "./Assets";
import "./Activity";
import "./Upload";
import "./Photo";
import "./Model3D";

