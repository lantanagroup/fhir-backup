"use strict";
exports.__esModule = true;
exports.BulkAnalyze = void 0;
var fs = require("fs");
var path = require("path");
var BulkAnalyze = (function () {
    function BulkAnalyze(options) {
        this.options = options;
    }
    BulkAnalyze.prototype.execute = function () {
        var _this = this;
        var files = fs.readdirSync(this.options.inputDir)
            .filter(function (f) { return f.toLowerCase().endsWith('.ndjson'); });
        var resources = [];
        if (!fs.existsSync(this.options.outputDir)) {
            fs.mkdirSync(this.options.outputDir);
        }
        console.log('Reading resources from directory');
        files.forEach(function (f) {
            var fileContent = fs.readFileSync(path.join(_this.options.inputDir, f)).toString();
            var fileLines = fileContent.replace(/\r/g, '').split('\n').filter(function (fl) { return !!fl; });
            var fileResources = fileLines.map(function (fl) { return JSON.parse(fl); });
            resources.push.apply(resources, fileResources);
        });
        var allConditions = resources
            .filter(function (r) { return r.resourceType === 'Condition' && r.code && r.code.coding && r.code.coding.length > 0; });
        var conditions = allConditions
            .map(function (r) {
            return {
                id: r.id,
                code: r.code.coding[0].code,
                system: r.code.coding[0].system,
                display: r.code.coding[0].display || r.code.text,
                patient: r.subject && r.subject.reference ? r.subject.reference.replace(/Patient\//g, '') : null,
                encounter: r.encounter && r.encounter.reference ? r.encounter.reference.replace(/Encounter\//g, '') : null,
                onset: r.onsetDateTime
            };
        });
        if (fs.existsSync(path.join(this.options.outputDir, 'conditions.tsv'))) {
            fs.unlinkSync(path.join(this.options.outputDir, 'conditions.tsv'));
        }
        conditions.forEach(function (condition) {
            fs.appendFileSync(path.join(_this.options.outputDir, 'conditions.tsv'), condition.id + "\t" + condition.patient + "\t" + condition.onset + "\t" + condition.code + "\t" + condition.system + "\t" + condition.display + "\t" + condition.encounter + "\n");
        });
        var encounters = resources
            .filter(function (r) { return r.resourceType === 'Encounter'; })
            .map(function (encounter) {
            return {
                id: encounter.id,
                classCode: encounter["class"].code,
                classSystem: encounter["class"].system,
                typeCode: encounter.type[0].coding[0].code,
                typeSystem: encounter.type[0].coding[0].system,
                patient: encounter.subject && encounter.subject.reference ? encounter.subject.reference.replace(/Patient\//g, '') : null,
                start: encounter.period ? encounter.period.start : '',
                end: encounter.period ? encounter.period.end : ''
            };
        });
        if (fs.existsSync(path.join(this.options.outputDir, 'encounters.tsv'))) {
            fs.unlinkSync(path.join(this.options.outputDir, 'encounters.tsv'));
        }
        encounters.forEach(function (encounter) {
            fs.appendFileSync(path.join(_this.options.outputDir, 'encounters.tsv'), encounter.id + "\t" + encounter.patient + "\t" + encounter.start + "\t" + encounter.end + "\t" + encounter.classCode + "\t" + encounter.classSystem + "\t" + encounter.typeCode + "\t" + encounter.typeSystem + "\n");
        });
        var medications = resources
            .filter(function (r) { return r.resourceType === 'MedicationStatement'; })
            .map(function (med) {
            return {
                id: med.id,
                code: med.medicationCodeableConcept ? med.medicationCodeableConcept.coding[0].code : '',
                system: med.medicationCodeableConcept ? med.medicationCodeableConcept.coding[0].system : '',
                display: med.medicationCodeableConcept ? med.medicationCodeableConcept.text : '',
                patient: med.subject && med.subject.reference ? med.subject.reference.replace(/Patient\//g, '') : '',
                encounter: med.context && med.context.reference ? med.context.reference.replace(/Encounter\//g, '') : '',
                start: med.effectivePeriod ? med.effectivePeriod.start || '' : '',
                end: med.effectivePeriod ? med.effectivePeriod.end || '' : ''
            };
        });
        if (fs.existsSync(path.join(this.options.outputDir, 'medications.tsv'))) {
            fs.unlinkSync(path.join(this.options.outputDir, 'medications.tsv'));
        }
        medications.forEach(function (med) {
            fs.appendFileSync(path.join(_this.options.outputDir, 'medications.tsv'), med.id + "\t" + med.patient + "\t" + med.start + "\t" + med.end + "\t" + med.code + "\t" + med.system + "\t" + med.display + "\n");
        });
        var allPatients = resources.filter(function (r) { return r.resourceType === 'Patient'; });
        var patients = allPatients
            .map(function (patient) {
            var raceExt = patient.extension ? patient.extension.find(function (e) { return e.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'; }) : null;
            var ethnicityExt = patient.extension ? patient.extension.find(function (e) { return e.url === 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity'; }) : null;
            return {
                id: patient.id,
                first: patient.name[0].given[0],
                last: patient.name[0].family,
                gender: patient.gender || '',
                birth: patient.birthDate || '',
                deceased: patient.deceasedDateTime || '',
                married: patient.maritalStatus ? patient.maritalStatus.coding[0].code : ''
            };
        });
        if (fs.existsSync(path.join(this.options.outputDir, 'patients.tsv'))) {
            fs.unlinkSync(path.join(this.options.outputDir, 'patients.tsv'));
        }
        patients.forEach(function (patient) {
            fs.appendFileSync(path.join(_this.options.outputDir, 'patients.tsv'), patient.id + "\t" + patient.first + "\t" + patient.last + "\t" + patient.gender + "\t" + patient.birth + "\t" + patient.deceased + "\t" + patient.married + "\n");
        });
        var observations = resources
            .filter(function (r) { return r.resourceType === 'Observation'; })
            .map(function (obs) {
            var value = '';
            var unit = '';
            var system = '';
            if (obs.hasOwnProperty('valueQuantity')) {
                value = obs.valueQuantity.value;
                unit = obs.valueQuantity.unit;
                system = obs.valueQuantity.system;
            }
            else if (obs.hasOwnProperty('valueString')) {
                value = obs.valueString;
            }
            else {
                console.log('unexpected value for observation');
            }
            return {
                id: obs.id,
                patient: obs.subject && obs.subject.reference ? obs.subject.reference.replace(/Patient\//g, '') : '',
                encounter: obs.encounter && obs.encounter.reference ? obs.encounter.reference.replace(/Encounter\//g, '') : '',
                date: obs.effectiveDateTime || '',
                code: obs.code.coding[0].code || '',
                codeSystem: obs.code.coding[0].system || '',
                display: obs.text || '',
                value: value,
                valueUnit: unit,
                valueSystem: system
            };
        });
        if (fs.existsSync(path.join(this.options.outputDir, 'observations.tsv'))) {
            fs.unlinkSync(path.join(this.options.outputDir, 'observations.tsv'));
        }
        observations.forEach(function (obs) {
            fs.appendFileSync(path.join(_this.options.outputDir, 'observations.tsv'), obs.id + "\t" + obs.patient + "\t" + obs.encounter + "\t" + obs.date + "\t" + obs.code + "\t" + obs.codeSystem + "\t" + obs.display + "\t" + obs.value + "\t" + obs.valueUnit + "\t" + obs.valueSystem + "\n");
        });
        console.log('Done analyzing bulk data directory');
    };
    return BulkAnalyze;
}());
exports.BulkAnalyze = BulkAnalyze;
//# sourceMappingURL=bulk-analyze.js.map