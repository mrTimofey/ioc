import 'reflect-metadata';
import Container, { Resolvable, inject } from '.';

@Resolvable class SomeClass {}
@Resolvable class SomeSubclass extends SomeClass {}
@Resolvable class SomeOtherClass {}
@Resolvable class SomeClassWithConstructor {
	constructor(
		public someClass: SomeClass,
		public someOtherClass: SomeOtherClass
	) {}
}

class BindBaseClass {}
@Resolvable class BindSubClass extends BindBaseClass {}

class SomeClassWithInject {
	bindBaseInstance: BindBaseClass;
	constructor() {
		this.bindBaseInstance = inject(BindBaseClass);
	}
}
class NoMetadataClass {
	constructor(
		public arg1: unknown,
		public arg2: unknown,
		public arg3 = inject(SomeClassWithConstructor),
		public arg4 = inject(SomeClassWithInject)
	) {}
}

describe('IOC container', () => {
	it('#get: resolves same instance for a single class', () => {
		const c = new Container();
		expect(c.get(SomeClass)).toStrictEqual(c.get(SomeClass));
	});

	it('#create: makes new instances for a single class', () => {
		const c = new Container();
		expect(c.create(SomeClass)).not.toStrictEqual(true);
	});

	it('#registerResolver: resolver receives resolvable class as first argument and container as a second one', () => {
		const c = new Container();
		c.registerResolver(SomeClass, (Ctor, container) => {
			expect(Ctor).toStrictEqual(SomeClass);
			expect(container).toStrictEqual(c);
			return new SomeSubclass();
		});
		c.get(SomeClass);
		c.create(SomeClass);
	});

	it('#registerResolver: resolver is respected by #get and #create', () => {
		const c = new Container();
		const resolvedValue = new SomeSubclass();
		c.registerResolver(SomeClass, () => resolvedValue);
		[c.get(SomeClass), c.create(SomeClass)].forEach(v => {
			expect(v).toStrictEqual(resolvedValue);
		});
	});

	it('#bind: bound class is respected by #get and #create', () => {
		const c = new Container();
		c.bind(BindBaseClass, BindSubClass);
		[c.get(BindBaseClass), c.create(BindBaseClass)].forEach(v => {
			expect(v).toBeInstanceOf(BindSubClass);
		});
	});

	it('#get and #create: resolves constructor arguments as single instances', () => {
		const c = new Container();
		const instances = [c.get(SomeClassWithConstructor), c.create(SomeClassWithConstructor)];
		expect(instances[0].someClass).toBeInstanceOf(SomeClass);
		expect(instances[1].someOtherClass).toBeInstanceOf(SomeOtherClass);
		expect(instances[0].someClass).toStrictEqual(instances[1].someClass);
		expect(instances[0].someOtherClass).toStrictEqual(instances[1].someOtherClass);
	});

	it('inject: works without metadata within a class constructor', () => {
		const c = new Container();
		const noMetadataInstance = c.get(NoMetadataClass);
		expect(noMetadataInstance === c.get(NoMetadataClass));
		expect(noMetadataInstance !== c.create(NoMetadataClass));
		expect(noMetadataInstance.arg1 === undefined);
		expect(noMetadataInstance.arg2 === undefined);
		expect(noMetadataInstance.arg3 === c.get(SomeClassWithConstructor));
		expect(noMetadataInstance.arg4 === c.get(SomeClassWithInject));
		expect(() => inject(SomeClass)).toThrowError();
	});

	it('inject: should not work outside a class constructor', () => {
		const c = new Container();
		c.get(NoMetadataClass);
		expect(() => inject(NoMetadataClass)).toThrowError();
	});
});
