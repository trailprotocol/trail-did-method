#!/usr/bin/env node

/**
 * TRAIL Protocol - DID Document Validator
 *
 * Validates whether a did:trail DID Document conforms to the
 * issue-defined validation rules and the core structures shown
 * in the did:trail method specification.
 */

const SELF_DID_RE = /^did:trail:self:z[1-9A-HJ-NP-Za-km-z]+$/;
const ORG_DID_RE = /^did:trail:org:[a-z0-9-]+-[a-f0-9]{16}$/;
const AGENT_DID_RE = /^did:trail:agent:[a-z0-9-]+-[a-f0-9]{16}$/;
const MULTIBASE_RE = /^z[1-9A-HJ-NP-Za-km-z]+$/;


function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}

function isValidTrailDid(value) {
  return (
    SELF_DID_RE.test(value) ||
    ORG_DID_RE.test(value) ||
    AGENT_DID_RE.test(value)
  );
}

function isValidTrailDidOrDidUrl(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }

  // Accept plain DID
  if (isValidTrailDid(value)) {
    return true;
  }

  // Accept DID URL forms like did:trail:org:...#key-1
  const [baseDid] = value.split("#");
  return isValidTrailDid(baseDid);
}

function validateRequiredFields(doc) {
  const errors = [];

  if (!isObject(doc)) {
    return ["DID Document must be a JSON object."];
  }

  const requiredFields = ["id", "controller", "verificationMethod", "authentication"];

  requiredFields.forEach((field) => {
    if (!(field in doc)) {
      errors.push(`Missing required top-level field: ${field}`);
    }
  });

  if ("id" in doc && !isNonEmptyString(doc.id)) {
    errors.push("Field 'id' must be a non-empty string.");
  }

  if ("controller" in doc) {
    const isString = isNonEmptyString(doc.controller);
    const isStringArray =
      Array.isArray(doc.controller) &&
      doc.controller.length > 0 &&
      doc.controller.every(isNonEmptyString);

    if (!isString && !isStringArray) {
      errors.push("Field 'controller' must be a non-empty string or a non-empty array of strings.");
    }
  }

  if ("verificationMethod" in doc) {
    if (!Array.isArray(doc.verificationMethod) || doc.verificationMethod.length === 0) {
      errors.push("Field 'verificationMethod' must be a non-empty array.");
    }
  }

  if ("authentication" in doc) {
    if (!Array.isArray(doc.authentication) || doc.authentication.length === 0) {
      errors.push("Field 'authentication' must be a non-empty array.");
    }
  }

  return errors;
}

function validateDidId(id) {
  const errors = [];

  if (!isNonEmptyString(id)) {
    return ["Field 'id' must be a non-empty string."];
  }

  if (!isValidTrailDid(id)) {
    errors.push(
      "Field 'id' must match one of the TRAIL DID formats: did:trail:self:<multibase>, did:trail:org:<slug>-<16hex>, or did:trail:agent:<slug>-<16hex>."
    );
  }

  return errors;
}

function validateControllers(controller) {
  const errors = [];

  if (isNonEmptyString(controller)) {
    if (!isValidTrailDidOrDidUrl(controller)) {
      errors.push("Field 'controller' must contain a valid did:trail DID or DID URL.");
    }
    return errors;
  }

  if (Array.isArray(controller)) {
    controller.forEach((value, index) => {
      if (!isValidTrailDidOrDidUrl(value)) {
        errors.push(`controller[${index}] must be a valid did:trail DID or DID URL.`);
      }
    });
  }

  return errors;
}

function validatePublicKeyJwk(jwk, path) {
  const errors = [];

  if (!isObject(jwk)) {
    return [`${path} must be an object.`];
  }

  if (jwk.kty !== "OKP") {
    errors.push(`${path}.kty must be "OKP".`);
  }

  if (jwk.crv !== "Ed25519") {
    errors.push(`${path}.crv must be "Ed25519".`);
  }

  if (!isNonEmptyString(jwk.x)) {
    errors.push(`${path}.x must be a non-empty string.`);
  }

  return errors;
}

function validateVerificationMethods(verificationMethods) {
  const errors = [];

  if (!Array.isArray(verificationMethods)) {
    return ["Field 'verificationMethod' must be an array."];
  }

  verificationMethods.forEach((vm, index) => {
    const path = `verificationMethod[${index}]`;

    if (!isObject(vm)) {
      errors.push(`${path} must be an object.`);
      return;
    }

    if (!isNonEmptyString(vm.id)) {
      errors.push(`${path}.id must be a non-empty string.`);
    } else if (!isValidTrailDidOrDidUrl(vm.id)) {
      errors.push(`${path}.id must be a valid did:trail DID URL.`);
    }

    if (!isNonEmptyString(vm.type)) {
      errors.push(`${path}.type must be a non-empty string.`);
    }

    if (!isNonEmptyString(vm.controller)) {
      errors.push(`${path}.controller must be a non-empty string.`);
    } else if (!isValidTrailDidOrDidUrl(vm.controller)) {
      errors.push(`${path}.controller must be a valid did:trail DID or DID URL.`);
    }

    const hasJwk = Object.prototype.hasOwnProperty.call(vm, "publicKeyJwk");
    const hasMultibase = Object.prototype.hasOwnProperty.call(vm, "publicKeyMultibase");

    if (!hasJwk && !hasMultibase) {
      errors.push(`${path} must include either publicKeyJwk or publicKeyMultibase.`);
    }

    if (hasJwk && hasMultibase) {
      errors.push(`${path} must not include both publicKeyJwk and publicKeyMultibase.`);
    }

    if (hasJwk) {
      errors.push(...validatePublicKeyJwk(vm.publicKeyJwk, `${path}.publicKeyJwk`));
    }

    if (hasMultibase) {
      if (!isNonEmptyString(vm.publicKeyMultibase) || !MULTIBASE_RE.test(vm.publicKeyMultibase)) {
        errors.push(`${path}.publicKeyMultibase must be a valid multibase string starting with 'z'.`);
      }
    }
  });

  return errors;
}

function validateAuthentication(authentication, verificationMethods) {
  const errors = [];

  if (!Array.isArray(authentication)) {
    return ["Field 'authentication' must be an array."];
  }

  const knownVmIds = new Set(
    Array.isArray(verificationMethods)
      ? verificationMethods
          .filter((vm) => isObject(vm) && isNonEmptyString(vm.id))
          .map((vm) => vm.id)
      : []
  );

  authentication.forEach((entry, index) => {
    const path = `authentication[${index}]`;

    if (!isNonEmptyString(entry)) {
      errors.push(`${path} must be a non-empty string reference.`);
      return;
    }

    if (!knownVmIds.has(entry)) {
      errors.push(`${path} must reference an existing verificationMethod.id.`);
    }
  });

  return errors;
}

function validateServices(services) {
  const errors = [];

  if (services === undefined) {
    return errors;
  }

  if (!Array.isArray(services)) {
    return ["Field 'service' must be an array if present."];
  }

  services.forEach((service, index) => {
    const path = `service[${index}]`;

    if (!isObject(service)) {
      errors.push(`${path} must be an object.`);
      return;
    }

    if (!isNonEmptyString(service.id)) {
      errors.push(`${path}.id must be a non-empty string.`);
    } else if (!isValidTrailDidOrDidUrl(service.id)) {
      errors.push(`${path}.id must be a valid did:trail DID URL.`);
    }

    if (!isNonEmptyString(service.type)) {
      errors.push(`${path}.type must be a non-empty string.`);
    }

    if (!isNonEmptyString(service.serviceEndpoint)) {
      errors.push(`${path}.serviceEndpoint must be a non-empty string.`);
    }
  });

  return errors;
}

function validateCapabilityDelegation(capabilityDelegation, verificationMethods) {
  const errors = [];

  if (capabilityDelegation === undefined) {
    return errors;
  }

  if (!Array.isArray(capabilityDelegation)) {
    return ["Field 'capabilityDelegation' must be an array if present."];
  }

  const knownVmIds = new Set(
    Array.isArray(verificationMethods)
      ? verificationMethods
          .filter((vm) => isObject(vm) && isNonEmptyString(vm.id))
          .map((vm) => vm.id)
      : []
  );

  capabilityDelegation.forEach((entry, index) => {
    const path = `capabilityDelegation[${index}]`;

    if (!isNonEmptyString(entry)) {
      errors.push(`${path} must be a non-empty string reference.`);
      return;
    }

    const isKnownVm = knownVmIds.has(entry);
    const isDidUrl = isValidTrailDidOrDidUrl(entry);

    if (!isKnownVm && !isDidUrl) {
      errors.push(
        `${path} must reference an existing verificationMethod.id or a valid did:trail DID URL.`
      );
    }
  });

  return errors;
}

function validateDidDocument(doc) {
  const errors = [];

  errors.push(...validateRequiredFields(doc));

  // Stop early if the basic shape is wrong.
  if (errors.length > 0) {
    return {
      valid: false,
      errors,
    };
  }

  errors.push(...validateDidId(doc.id));
  errors.push(...validateControllers(doc.controller));
  errors.push(...validateVerificationMethods(doc.verificationMethod));
  errors.push(...validateAuthentication(doc.authentication, doc.verificationMethod));
  errors.push(...validateServices(doc.service));
  errors.push(...validateCapabilityDelegation(doc.capabilityDelegation, doc.verificationMethod));
  errors.push(...validateAgentParentOrganization(doc));

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateAgentParentOrganization(doc) {
  const errors = [];

  if (!isNonEmptyString(doc.id) || !AGENT_DID_RE.test(doc.id)) {
    return errors;
  }

  const parentOrg = doc["trail:parentOrganization"];

  if (!isNonEmptyString(parentOrg)) {
    errors.push("Agent DID Documents must include 'trail:parentOrganization' as a non-empty string.");
    return errors;
  }

  if (!ORG_DID_RE.test(parentOrg)) {
    errors.push("'trail:parentOrganization' must be a valid did:trail:org DID.");
  }

  return errors;
}


module.exports = {
  validateDidDocument,
  validateRequiredFields,
  validateDidId,
  validateVerificationMethods,
  validateAuthentication,
  validateServices,
  validateCapabilityDelegation,
  validateAgentParentOrganization
};