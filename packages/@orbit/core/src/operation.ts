import { Record, RecordIdentity, cloneRecordIdentity, equalRecordIdentities, serializeRecordIdentity } from './record';
import { eq } from '@orbit/utils';

export interface Operation {
  op: string;
}

export interface AddRecordOperation extends Operation {
  op: 'addRecord';
  record: Record;
}

export function addRecord(record: Record): AddRecordOperation {
  return { op: 'addRecord', record};
}

export interface ReplaceRecordOperation extends Operation {
  op: 'replaceRecord';
  record: Record;
}

export function replaceRecord(record: Record): ReplaceRecordOperation {
  return { op: 'replaceRecord', record};
}

export interface RemoveRecordOperation extends Operation {
  op: 'removeRecord';
  record: RecordIdentity;
}

export function removeRecord(record: Record): RemoveRecordOperation {
  return { op: 'removeRecord', record};
}

export interface ReplaceKeyOperation extends Operation {
  op: 'replaceKey';
  record: RecordIdentity;
  key: string;
  value: string;
}

export function replaceKey(record: Record, key: string, value: string): ReplaceKeyOperation {
  return { op: 'replaceKey', record, key, value };
}

export interface ReplaceAttributeOperation extends Operation {
  op: 'replaceAttribute';
  record: RecordIdentity;
  attribute: string;
  value: any;
}

export function replaceAttribute(record: Record, attribute: string, value: any): ReplaceAttributeOperation {
  return { op: 'replaceAttribute', record, attribute, value };
}

export interface AddToHasManyOperation extends Operation {
  op: 'addToHasMany';
  record: RecordIdentity;
  relationship: string;
  relatedRecord: RecordIdentity;
}

export function addToHasMany(record: Record, relationship: string, relatedRecord: RecordIdentity): AddToHasManyOperation {
  return { op: 'addToHasMany', record, relationship, relatedRecord };
}

export interface RemoveFromHasManyOperation extends Operation {
  op: 'removeFromHasMany';
  record: RecordIdentity;
  relationship: string;
  relatedRecord: RecordIdentity;
}

export function removeFromHasMany(record: Record, relationship: string, relatedRecord: RecordIdentity): RemoveFromHasManyOperation {
  return { op: 'removeFromHasMany', record, relationship, relatedRecord };
}

export interface ReplaceHasManyOperation extends Operation {
  op: 'replaceHasMany';
  record: RecordIdentity;
  relationship: string;
  relatedRecords: RecordIdentity[];
}

export function replaceHasMany(record: Record, relationship: string, relatedRecords: RecordIdentity[]): ReplaceHasManyOperation {
  return { op: 'replaceHasMany', record, relationship, relatedRecords };
}

export interface ReplaceHasOneOperation extends Operation {
  op: 'replaceHasOne';
  record: RecordIdentity;
  relationship: string;
  relatedRecord: RecordIdentity;
}

export function replaceHasOne(record: Record, relationship: string, relatedRecord: RecordIdentity): ReplaceHasOneOperation {
  return { op: 'replaceHasOne', record, relationship, relatedRecord };
}

export type RecordOperation = AddRecordOperation |
  ReplaceRecordOperation |
  RemoveRecordOperation |
  ReplaceKeyOperation |
  ReplaceAttributeOperation |
  AddToHasManyOperation |
  RemoveFromHasManyOperation |
  ReplaceHasManyOperation |
  ReplaceHasOneOperation;

function markOperationToDelete(operation: Operation): void {
  const o: any = operation;
  o._deleted = true;
}

function isOperationMarkedToDelete(operation: Operation): boolean {
  const o: any = operation;
  return o._deleted === true;
}

function mergeOps(superceded: RecordOperation, superceding: RecordOperation, consecutiveOps: boolean): void {
  if (equalRecordIdentities(superceded.record, superceding.record)) {
    if (superceding.op === 'removeRecord') {
      markOperationToDelete(superceded);
      if (superceded.op === 'addRecord') {
        markOperationToDelete(superceding);
      }
    } else if (!isOperationMarkedToDelete(superceding) && (consecutiveOps || superceding.op === 'replaceAttribute')) {
      if (isReplaceFieldOp(superceded.op) && isReplaceFieldOp(superceding.op)) {
        if (superceded.op === 'replaceAttribute' &&
            superceding.op === 'replaceAttribute' &&
            superceded.attribute === superceding.attribute) {
          markOperationToDelete(superceded);
        } else if (superceded.op === 'replaceHasOne' &&
            superceding.op === 'replaceHasOne' &&
            superceded.relationship === superceding.relationship) {
          markOperationToDelete(superceded);
        } else if (superceded.op === 'replaceHasMany' &&
            superceding.op === 'replaceHasMany' &&
            superceded.relationship === superceding.relationship) {
          markOperationToDelete(superceded);
        } else {
          if (superceded.op === 'replaceAttribute') {
            updateRecordReplaceAttribute(superceded.record, superceded.attribute, superceded.value);
            delete superceded.attribute;
            delete superceded.value;
          } else if (superceded.op === 'replaceHasOne') {
            updateRecordReplaceHasOne(superceded.record, superceded.relationship, superceded.relatedRecord);
            delete superceded.relationship;
            delete superceded.relatedRecord;
          } else if (superceded.op === 'replaceHasMany') {
            updateRecordReplaceHasMany(superceded.record, superceded.relationship, superceded.relatedRecords);
            delete superceded.relationship;
            delete superceded.relatedRecords;
          }
          if (superceding.op === 'replaceAttribute') {
            updateRecordReplaceAttribute(superceded.record, superceding.attribute, superceding.value);
          } else if (superceding.op === 'replaceHasOne') {
            updateRecordReplaceHasOne(superceded.record, superceding.relationship, superceding.relatedRecord);
          } else if (superceding.op === 'replaceHasMany') {
            updateRecordReplaceHasMany(superceded.record, superceding.relationship, superceding.relatedRecords);
          }
          superceded.op = 'replaceRecord';
          markOperationToDelete(superceding);
        }
      } else if ((superceded.op === 'addRecord' || superceded.op === 'replaceRecord') &&
                 isReplaceFieldOp(superceding.op)) {
        if (superceding.op === 'replaceAttribute') {
          updateRecordReplaceAttribute(superceded.record, superceding.attribute, superceding.value);
        } else if (superceding.op === 'replaceHasOne') {
          updateRecordReplaceHasOne(superceded.record, superceding.relationship, superceding.relatedRecord);
        } else if (superceding.op === 'replaceHasMany') {
          updateRecordReplaceHasMany(superceded.record, superceding.relationship, superceding.relatedRecords);
        }
        markOperationToDelete(superceding);
      } else if (superceding.op === 'addToHasMany') {
        if (superceded.op === 'addRecord') {
          updateRecordAddToHasMany(superceded.record, superceding.relationship, superceding.relatedRecord);
          markOperationToDelete(superceding);
        } else if (superceded.op === 'replaceRecord') {
          if (superceded.record.relationships &&
              superceded.record.relationships[superceding.relationship] &&
              superceded.record.relationships[superceding.relationship].data) {
            updateRecordAddToHasMany(superceded.record, superceding.relationship, superceding.relatedRecord);
            markOperationToDelete(superceding);
          }
        }
      } else if (superceding.op === 'removeFromHasMany') {
        if (superceded.op === 'addToHasMany' &&
            superceded.relationship === superceding.relationship &&
            equalRecordIdentities(superceded.relatedRecord, superceding.relatedRecord)) {
          markOperationToDelete(superceded);
          markOperationToDelete(superceding);
        } else if (superceded.op === 'addRecord' || superceded.op === 'replaceRecord') {
          if (superceded.record.relationships &&
              superceded.record.relationships[superceding.relationship] &&
              superceded.record.relationships[superceding.relationship].data &&
              superceded.record.relationships[superceding.relationship].data[serializeRecordIdentity(superceding.relatedRecord)]) {
            delete superceded.record.relationships[superceding.relationship].data[serializeRecordIdentity(superceding.relatedRecord)];
            markOperationToDelete(superceding);
          }
        }
      }
    }
  }
}

function isReplaceFieldOp(op: string): boolean {
  return (op === 'replaceAttribute' ||
          op === 'replaceHasOne' ||
          op === 'replaceHasMany');
}

function updateRecordReplaceAttribute(record: Record, attribute: string, value: any) {
  record.attributes = record.attributes || {};
  record.attributes[attribute] = value;
}

function updateRecordReplaceHasOne(record: Record, relationship: string, relatedRecord: RecordIdentity) {
  record.relationships = record.relationships || {};
  record.relationships[relationship] = record.relationships[relationship] || { data: null };
  record.relationships[relationship].data = serializeRecordIdentity(relatedRecord);
}

function updateRecordReplaceHasMany(record: Record, relationship: string, relatedRecords: RecordIdentity[]) {
  record.relationships = record.relationships || {};
  record.relationships[relationship] = record.relationships[relationship] || { data: {} };
  let relatedRecordData = {};
  relatedRecords.forEach(r => {
    relatedRecordData[serializeRecordIdentity(r)] = true;
  });
  record.relationships[relationship].data = relatedRecordData;
}

function updateRecordAddToHasMany(record: Record, relationship: string, relatedRecord: RecordIdentity) {
  record.relationships = record.relationships || {};
  record.relationships[relationship] = record.relationships[relationship] || { data: {} };
  record.relationships[relationship].data = record.relationships[relationship].data || {};
  record.relationships[relationship].data[serializeRecordIdentity(relatedRecord)] = true;
}

/**
 Coalesces operations into a minimal set of equivalent operations.

 This method respects the order of the operations array and does not allow
 reordering of operations that affect relationships.

 @method coalesceOperations
 @for Orbit
 @param {Array} operations
 @returns {Array}
 */
export function coalesceRecordOperations(operations: RecordOperation[]): RecordOperation[] {
  for (let i = 0, l = operations.length; i < l; i++) {
    let currentOp = operations[i];
    let consecutiveOps = true;

    for (let j = i + 1; j < l; j++) {
      let nextOp = operations[j];

      mergeOps(currentOp, nextOp, consecutiveOps);

      if (isOperationMarkedToDelete(currentOp)) {
        break;
      } else if (!isOperationMarkedToDelete(nextOp)) {
        consecutiveOps = false;
      }
    }
  }

  return operations.filter(o => !isOperationMarkedToDelete(o));
}

export function recordDiffs(record: Record, updatedRecord: Record): RecordOperation[] {
  const diffs: RecordOperation[] = [];

  if (record && updatedRecord) {
    const recordIdentity = cloneRecordIdentity(record);

    if (updatedRecord.attributes) {
      Object.keys(updatedRecord.attributes).forEach(attribute => {
        let value = updatedRecord.attributes[attribute];

        if (record.attributes === undefined || !eq(record.attributes[attribute], value)) {
          let op: ReplaceAttributeOperation = {
            op: 'replaceAttribute',
            record: recordIdentity,
            attribute,
            value
          }

          diffs.push(op);
        }
      });
    }

    if (updatedRecord.keys) {
      Object.keys(updatedRecord.keys).forEach(key => {
        let value = updatedRecord.keys[key];
        if (record.keys === undefined || !eq(record.keys[key], value)) {
          let op: ReplaceKeyOperation = {
            op: 'replaceKey',
            record: recordIdentity,
            key,
            value
          }

          diffs.push(op);
        }
      });
    }

    // TODO - handle relationships
  }

  return diffs;
}
