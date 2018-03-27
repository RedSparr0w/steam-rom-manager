import { ValidatorModifier } from "../../../models";
import * as Ajv from "ajv";
import * as _ from "lodash";

export class Validator<T = object> {
    private static ajv = new Ajv({ removeAdditional: "all", useDefaults: true });
    private validationFn: Ajv.ValidateFunction | null = null;
    private modifier: ValidatorModifier<T> | null = null;

    constructor(schema?: object, modifier?: ValidatorModifier<T>) {
        if (schema !== undefined) {
            this.setSchema(schema);
        }
        if (modifier !== undefined) {
            this.setModifier(modifier);
        }
    }

    public setSchema(schema: object) {
        if (schema) {
            this.validationFn = Validator.ajv.compile(schema);
        }
        else {
            this.validationFn = null;
        }

        return this;
    }

    public setModifier(modifier: ValidatorModifier<T>) {
        if (modifier) {
            this.modifier = modifier;
        }
        else {
            this.modifier = null;
        }

        return this;
    }

    public validate(data: object) {
        if (this.modifier) {
            while (this.modify(data)) { }
            _.set(data, this.modifier.controlProperty, this.modifier.latestVersion);
        }

        if (this.validationFn) {
            this.validationFn(data);
        }

        return this;
    }

    get errors() {
        if (this.validationFn) {
            return this.validationFn.errors || null;
        }
        else {
            return null;
        }
    }

    get errorString() {
        const errors = this.errors;
        return errors !== null ? JSON.stringify(errors, null, "\t") : "";
    }

    public isValid() {
        return this.errors === null;
    }

    public getDefaultValues() {
        const data = {};
        if (this.validationFn) {
            this.validationFn(data);
            if (this.modifier) {
                _.set(data, this.modifier.controlProperty, this.modifier.latestVersion);
            }
        }
        return data as T;
    }

    private modify(data: any) {
        const controlValue = _.get(data, this.modifier!.controlProperty, undefined);
        const modifierFieldSet = this.modifier!.fields[controlValue];

        if (modifierFieldSet) {
            for (const key in modifierFieldSet) {
                const fieldData = modifierFieldSet[key];

                if (fieldData.method) {
                    _.set(
                        data,
                        key,
                        fieldData.method(
                            _.get(
                                data,
                                typeof fieldData.oldValuePath === "string" ? fieldData.oldValuePath : key, undefined,
                            ),
                            data,
                        ),
                    );
                }
                else if (typeof fieldData.oldValuePath === "string") {
                    _.set(data, key, _.get(data, fieldData.oldValuePath, undefined));
                }
            }
            return !_.isEqual(controlValue, _.get(data, this.modifier!.controlProperty, undefined));
        }
        else {
            return false;
        }
    }
}
