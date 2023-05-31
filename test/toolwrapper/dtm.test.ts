import { expect } from 'chai';
import { describe, it } from 'mocha';
import sinon from 'sinon';
import DtmWrapper from '../../src/toolwrapper/dtm';


describe('DtmWrapper', () => {
	let dtmWrapper: DtmWrapper;
	let commitStub: sinon.SinonStub;
	let commitAllStub: sinon.SinonStub;
  
	beforeEach(() => {
	  dtmWrapper = new DtmWrapper();
	  commitStub = sinon.stub(dtmWrapper, 'commit');
	  commitAllStub = sinon.stub(dtmWrapper, 'commitall');
	});
  
	afterEach(() => {
	  commitStub.restore();
	  commitAllStub.restore();
	});

  describe('commit', () => {
    it('should return a DtmResponse object with status 0 when the commit is successful', async () => {
      const commitMsg = 'Test commit message';
      const mockResponse = {
        status: 0,
        message: 'Commit successful',
        log: 'Commit log',
      };

      commitStub.resolves(mockResponse);

      const response = await dtmWrapper.commit(commitMsg);

      expect(response).to.have.property('status', 0);
      expect(response).to.have.property('message');
      expect(response).to.have.property('log');
      expect(commitStub.calledOnce).to.be.true;
    });

    // Add more test cases for the commit method here
  });

  describe('commitall', () => {
    it('should return a DtmResponse object with status 0 when the commit is successful', async () => {
		const commitMsg = 'Test commit message';
		const mockResponse = {
		  status: 0,
		  message: 'Commit all successful',
		  log: 'Commit all log',
		};
  
		commitAllStub.resolves(mockResponse);
  
		const response = await dtmWrapper.commitall(commitMsg);
  
		expect(response).to.have.property('status', 0);
		expect(response).to.have.property('message');
		expect(response).to.have.property('log');
		expect(commitAllStub.calledOnce).to.be.true;
	  });
  });
});